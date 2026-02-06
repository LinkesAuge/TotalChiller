"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { z } from "zod";
import createSupabaseBrowserClient from "../../lib/supabase/browser-client";
import formatGermanDateTime from "../../lib/date-format";
import useClanContext from "../components/use-clan-context";
import { useToast } from "../components/toast-provider";
import RadixSelect from "../components/ui/radix-select";

interface ArticleRow {
  readonly id: string;
  readonly title: string;
  readonly content: string;
  readonly type: string;
  readonly is_pinned: boolean;
  readonly status: string;
  readonly tags: readonly string[];
  readonly created_at: string;
}

const ARTICLE_SCHEMA = z.object({
  title: z.string().min(3),
  content: z.string().min(5),
  type: z.enum(["news", "announcement"]),
  isPinned: z.boolean(),
  status: z.enum(["draft", "pending", "published"]),
  tags: z.array(z.string()).optional(),
});

function NewsClient(): JSX.Element {
  const supabase = createSupabaseBrowserClient();
  const clanContext = useClanContext();
  const { pushToast } = useToast();
  const [articles, setArticles] = useState<readonly ArticleRow[]>([]);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string>("");
  const [title, setTitle] = useState<string>("");
  const [content, setContent] = useState<string>("");
  const [type, setType] = useState<"news" | "announcement">("news");
  const [status, setStatus] = useState<"draft" | "pending" | "published">("published");
  const [isPinned, setIsPinned] = useState<boolean>(false);
  const [tagsInput, setTagsInput] = useState<string>("");
  const [tagFilter, setTagFilter] = useState<string>("all");

  const tags = useMemo(() => {
    return tagsInput
      .split(",")
      .map((item) => item.trim())
      .filter((item) => Boolean(item));
  }, [tagsInput]);

  useEffect(() => {
    async function loadArticles(): Promise<void> {
      if (!clanContext?.clanId) {
        setArticles([]);
        return;
      }
      let query = supabase
        .from("articles")
        .select("id,title,content,type,is_pinned,status,tags,created_at")
        .eq("clan_id", clanContext.clanId);
      if (tagFilter !== "all") {
        query = query.contains("tags", [tagFilter]);
      }
      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) {
        pushToast(`Failed to load news: ${error.message}`);
        return;
      }
      setArticles((data ?? []) as ArticleRow[]);
    }
    void loadArticles();
  }, [clanContext?.clanId, pushToast, supabase, tagFilter]);

  async function handleCreateArticle(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!clanContext?.clanId) {
      pushToast("Select a clan first.");
      return;
    }
    const parsed = ARTICLE_SCHEMA.safeParse({
      title,
      content,
      type,
      status,
      isPinned,
      tags,
    });
    if (!parsed.success) {
      pushToast("Check your form values.");
      return;
    }
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) {
      pushToast("You must be logged in.");
      return;
    }
    const payload = {
      clan_id: clanContext.clanId,
      title: parsed.data.title,
      content: parsed.data.content,
      type: parsed.data.type,
      status: parsed.data.status,
      is_pinned: parsed.data.isPinned,
      tags: parsed.data.tags ?? [],
      created_by: userId,
    };
    setIsCreating(true);
    const { error } = editingId
      ? await supabase.from("articles").update(payload).eq("id", editingId)
      : await supabase.from("articles").insert(payload);
    setIsCreating(false);
    if (error) {
      pushToast(`Failed to save post: ${error.message}`);
      return;
    }
    setTitle("");
    setContent("");
    setType("news");
    setStatus("published");
    setIsPinned(false);
    setTagsInput("");
    setEditingId("");
    pushToast(editingId ? "Post updated." : "Post created.");
    const { data, error: reloadError } = await supabase
      .from("articles")
      .select("id,title,content,type,is_pinned,status,tags,created_at")
      .eq("clan_id", clanContext.clanId)
      .order("created_at", { ascending: false });
    if (reloadError) {
      pushToast(`Failed to refresh posts: ${reloadError.message}`);
      return;
    }
    setArticles((data ?? []) as ArticleRow[]);
  }

  function handleEditArticle(article: ArticleRow): void {
    setEditingId(article.id);
    setTitle(article.title);
    setContent(article.content);
    setType(article.type as "news" | "announcement");
    setStatus(article.status as "draft" | "pending" | "published");
    setIsPinned(article.is_pinned);
    setTagsInput(article.tags.join(","));
  }

  async function handleDeleteArticle(articleId: string): Promise<void> {
    const confirmDelete = window.confirm("Delete this post?");
    if (!confirmDelete) {
      return;
    }
    const { error } = await supabase.from("articles").delete().eq("id", articleId);
    if (error) {
      pushToast(`Failed to delete post: ${error.message}`);
      return;
    }
    setArticles((current) => current.filter((item) => item.id !== articleId));
    pushToast("Post deleted.");
  }

  const availableTags = useMemo(() => {
    const tagSet = new Set<string>();
    articles.forEach((article) => {
      article.tags.forEach((tag) => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, [articles]);

  return (
    <div className="grid">
      <section className="card" style={{ gridColumn: "span 12" }}>
        <div className="card-header">
          <div>
            <div className="card-title">{editingId ? "Edit Post" : "Create Post"}</div>
            <div className="card-subtitle">Visible to the selected clan</div>
          </div>
        </div>
        <form onSubmit={handleCreateArticle}>
          <div className="form-group">
            <label htmlFor="newsTitle">Title</label>
            <input
              id="newsTitle"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Post title"
            />
          </div>
          <div className="form-group">
            <label htmlFor="newsContent">Content</label>
            <textarea
              id="newsContent"
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder="Write the announcement"
            />
          </div>
          <div className="form-group">
            <label htmlFor="newsType">Type</label>
            <RadixSelect
              id="newsType"
              ariaLabel="Type"
              value={type}
              onValueChange={(value) => setType(value as "news" | "announcement")}
              options={[
                { value: "news", label: "news" },
                { value: "announcement", label: "announcement" },
              ]}
            />
          </div>
          <div className="form-group">
            <label htmlFor="newsStatus">Status</label>
            <RadixSelect
              id="newsStatus"
              ariaLabel="Status"
              value={status}
              onValueChange={(value) => setStatus(value as "draft" | "pending" | "published")}
              options={[
                { value: "draft", label: "draft" },
                { value: "pending", label: "pending" },
                { value: "published", label: "published" },
              ]}
            />
          </div>
          <div className="form-group">
            <label htmlFor="newsTags">Tags</label>
            <input
              id="newsTags"
              value={tagsInput}
              onChange={(event) => setTagsInput(event.target.value)}
              placeholder="comma,separated,tags"
            />
          </div>
          <div className="list inline">
            <label className="text-muted">
              <input
                type="checkbox"
                checked={isPinned}
                onChange={(event) => setIsPinned(event.target.checked)}
              />{" "}
              Pin this post
            </label>
          </div>
          <div className="list">
            <button className="button primary" type="submit" disabled={isCreating}>
              {isCreating ? "Saving..." : editingId ? "Save Changes" : "Create Post"}
            </button>
            {editingId ? (
              <button
                className="button"
                type="button"
                onClick={() => {
                  setEditingId("");
                  setTitle("");
                  setContent("");
                  setType("news");
                  setStatus("published");
                  setIsPinned(false);
                  setTagsInput("");
                }}
              >
                Cancel
              </button>
            ) : null}
          </div>
        </form>
      </section>
      <section className="card" style={{ gridColumn: "span 12" }}>
        <div className="card-header">
          <div>
            <div className="card-title">Filter by Tag</div>
            <div className="card-subtitle">Show posts with a tag</div>
          </div>
        </div>
        <div className="form-group">
          <label htmlFor="tagFilter">Tag</label>
          <RadixSelect
            id="tagFilter"
            ariaLabel="Tag"
            value={tagFilter}
            onValueChange={(value) => setTagFilter(value)}
            options={[
              { value: "all", label: "All" },
              ...availableTags.map((tag) => ({ value: tag, label: tag })),
            ]}
          />
        </div>
      </section>
      {articles.length === 0 ? (
        <section className="card">
          <div className="card-header">
            <div>
              <div className="card-title">No posts yet</div>
              <div className="card-subtitle">Create the first announcement</div>
            </div>
          </div>
        </section>
      ) : (
        articles.map((article) => (
          <section className="card" key={article.id}>
            <div className="card-header">
              <div>
                <div className="card-title">{article.title}</div>
                <div className="card-subtitle">
                  {article.type} • {formatGermanDateTime(article.created_at)}
                </div>
              </div>
              <span className="badge">{article.status}</span>
            </div>
            <p>{article.content}</p>
            <div className="list inline">
              {article.is_pinned ? <span className="badge">Pinned</span> : null}
              {article.tags.map((tag) => (
                <span className="badge" key={tag}>
                  {tag}
                </span>
              ))}
            </div>
            <div className="list inline">
              <button className="button" type="button" onClick={() => handleEditArticle(article)}>
                Edit
              </button>
              <button className="button danger" type="button" onClick={() => handleDeleteArticle(article.id)}>
                Delete
              </button>
            </div>
          </section>
        ))
      )}
    </div>
  );
}

export default NewsClient;
