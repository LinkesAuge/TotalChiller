-- Re-Matching: Automatically re-match pending staged entries when game accounts
-- or OCR corrections change. Also callable via RPC for manual re-matching.
-- Run in Supabase SQL Editor after data_pipeline_validation.sql.

-- ─── 1. Core RPC function ───────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.rematch_pending_entries(
  p_clan_id uuid,
  p_submission_id uuid DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_matched integer := 0;
  v_matched integer;
  v_sub record;
  v_staged_table text;
  v_tables text[] := ARRAY['staged_chest_entries', 'staged_member_entries', 'staged_event_entries'];
BEGIN
  -- For each staged table, update pending entries where player_name matches
  -- a game account (directly or via OCR correction).
  FOR i IN 1..array_length(v_tables, 1) LOOP
    v_staged_table := v_tables[i];

    EXECUTE format(
      'UPDATE %I staged SET
         matched_game_account_id = match.account_id,
         item_status = ''auto_matched''
       FROM (
         SELECT staged2.id AS entry_id, ga.id AS account_id
         FROM %I staged2
         JOIN data_submissions ds ON ds.id = staged2.submission_id
         LEFT JOIN game_account_clan_memberships gacm
           ON gacm.clan_id = ds.clan_id AND gacm.is_active = true
         LEFT JOIN game_accounts ga
           ON ga.id = gacm.game_account_id
         LEFT JOIN ocr_corrections oc
           ON oc.clan_id = ds.clan_id
           AND oc.entity_type = ''player''
           AND lower(oc.ocr_text) = lower(staged2.player_name)
         WHERE ds.clan_id = $1
           AND ds.status IN (''pending'', ''partial'')
           AND staged2.item_status = ''pending''
           AND staged2.matched_game_account_id IS NULL
           AND ($2 IS NULL OR ds.id = $2)
           AND (
             lower(staged2.player_name) = lower(ga.game_username)
             OR lower(COALESCE(oc.corrected_text, '''')) = lower(ga.game_username)
           )
       ) match
       WHERE staged.id = match.entry_id',
      v_staged_table, v_staged_table
    )
    USING p_clan_id, p_submission_id;

    GET DIAGNOSTICS v_matched = ROW_COUNT;
    v_total_matched := v_total_matched + v_matched;
  END LOOP;

  -- Update matched_count on affected submissions
  FOR v_sub IN
    SELECT ds.id AS sub_id, ds.submission_type
    FROM data_submissions ds
    WHERE ds.clan_id = p_clan_id
      AND ds.status IN ('pending', 'partial')
      AND (p_submission_id IS NULL OR ds.id = p_submission_id)
  LOOP
    v_staged_table := CASE v_sub.submission_type
      WHEN 'chests' THEN 'staged_chest_entries'
      WHEN 'members' THEN 'staged_member_entries'
      WHEN 'events' THEN 'staged_event_entries'
    END;

    IF v_staged_table IS NOT NULL THEN
      EXECUTE format(
        'UPDATE data_submissions SET matched_count = (
           SELECT count(*) FROM %I
           WHERE submission_id = $1
             AND matched_game_account_id IS NOT NULL
         )
         WHERE id = $1',
        v_staged_table
      )
      USING v_sub.sub_id;
    END IF;
  END LOOP;

  RETURN v_total_matched;
END;
$$;

COMMENT ON FUNCTION public.rematch_pending_entries IS
  'Re-matches pending staged entries against current game accounts and OCR corrections. '
  'Optionally scoped to a single submission via p_submission_id.';


-- ─── 2. Trigger function ────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.trigger_rematch_pending()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_clan_id uuid;
  v_old_clan_id uuid;
  v_new_clan_id uuid;
BEGIN
  -- Extract clan_id depending on the source table
  IF TG_TABLE_NAME = 'game_accounts' THEN
    -- game_accounts doesn't have clan_id directly; look up via memberships
    FOR v_clan_id IN
      SELECT DISTINCT gacm.clan_id
      FROM game_account_clan_memberships gacm
      WHERE gacm.game_account_id = COALESCE(NEW.id, OLD.id)
        AND gacm.is_active = true
    LOOP
      PERFORM rematch_pending_entries(v_clan_id);
    END LOOP;
    RETURN COALESCE(NEW, OLD);

  ELSIF TG_TABLE_NAME = 'game_account_clan_memberships' THEN
    v_old_clan_id := CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN OLD.clan_id ELSE NULL END;
    v_new_clan_id := CASE WHEN TG_OP IN ('UPDATE', 'INSERT') THEN NEW.clan_id ELSE NULL END;

    -- On UPDATE with clan move, rematch both old and new clan scopes.
    IF TG_OP = 'UPDATE' AND v_old_clan_id IS NOT NULL AND v_old_clan_id IS DISTINCT FROM v_new_clan_id THEN
      PERFORM rematch_pending_entries(v_old_clan_id);
    END IF;

    v_clan_id := COALESCE(v_new_clan_id, v_old_clan_id);

  ELSIF TG_TABLE_NAME = 'ocr_corrections' THEN
    IF COALESCE(NEW.entity_type, OLD.entity_type) <> 'player' THEN
      RETURN COALESCE(NEW, OLD);
    END IF;
    v_clan_id := COALESCE(NEW.clan_id, OLD.clan_id);

  ELSE
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF v_clan_id IS NOT NULL THEN
    PERFORM rematch_pending_entries(v_clan_id);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;


-- ─── 3. Triggers ────────────────────────────────────────────────────────────

-- game_accounts: re-match when username changes
DROP TRIGGER IF EXISTS trg_rematch_on_game_account_update ON public.game_accounts;
CREATE TRIGGER trg_rematch_on_game_account_update
  AFTER UPDATE OF game_username ON public.game_accounts
  FOR EACH ROW
  WHEN (OLD.game_username IS DISTINCT FROM NEW.game_username)
  EXECUTE FUNCTION public.trigger_rematch_pending();

-- game_account_clan_memberships: re-match when member added/removed
DROP TRIGGER IF EXISTS trg_rematch_on_membership_change ON public.game_account_clan_memberships;
CREATE TRIGGER trg_rematch_on_membership_change
  AFTER INSERT OR DELETE OR UPDATE OF clan_id, game_account_id, is_active ON public.game_account_clan_memberships
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_rematch_pending();

-- ocr_corrections: re-match when player corrections change
DROP TRIGGER IF EXISTS trg_rematch_on_correction_change ON public.ocr_corrections;
CREATE TRIGGER trg_rematch_on_correction_change
  AFTER INSERT OR UPDATE OR DELETE ON public.ocr_corrections
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_rematch_pending();
