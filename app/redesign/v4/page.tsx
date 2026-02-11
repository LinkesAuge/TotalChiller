"use client";
import { VariantShell, ShellConfig } from "../variant-shell";

const SIBLINGS = [
  { href: "/redesign/v1", label: "Home" },
  { href: "/redesign/v2", label: "Dashboard" },
  { href: "/redesign/v3", label: "News" },
  { href: "/redesign/v5", label: "Events" },
  { href: "/redesign/v6", label: "Forum" },
];

/**
 * V4 — Royal Blue Members: Richer, more saturated blue with blue headers.
 * The most "blue" variant — strong visual identity for member data.
 */
const cfg: ShellConfig = {
  id: "v4",
  name: "Royal Blue — Members",
  pageType: "Mitglieder",
  activeNav: 6,
  palette: {
    bg: "#0a1830",
    bgGrad: "radial-gradient(ellipse at 40% 10%, #1a3560, #0a1830 70%)",
    sidebarTop: "#0e1e40",
    sidebarBot: "#081428",
    sidebarBorder: "rgba(200,160,80,0.35)",
    gold: "#cca848",
    gold2: "#e4c068",
    headerGrad: "linear-gradient(180deg,#162e52,#0e2040)",
    navActiveBg: "rgba(30,56,100,0.4)",
    navActiveHover: "rgba(30,56,100,0.25)",
    surface: "rgba(10,24,50,0.9)",
    surfaceAlt: "rgba(8,20,42,0.5)",
  },
  assets: {
    heroBg: "backgrounds/heroes_back_abstract.png",
    heroFilter: "brightness(.16) saturate(.3)",
    drapery: "drapery/drapery_tir_hero_1.png",
    ornateFilter: "sepia(1) saturate(.25) hue-rotate(200deg) brightness(.65)",
    banner: "banners/banner_captain.png",
  },
  siblings: SIBLINGS,
};

const MEMBERS = [
  { name: "Schmerztherapeuth", rank: "Ancient", score: "12,450", chests: "2,140", lvl: "45", status: "Online" },
  { name: "DragonSlayer", rank: "Commander", score: "11,200", chests: "1,980", lvl: "43", status: "Online" },
  { name: "IronFist", rank: "Captain", score: "9,800", chests: "1,720", lvl: "41", status: "Online" },
  { name: "PhoenixRise", rank: "Captain", score: "9,200", chests: "1,680", lvl: "40", status: "Offline" },
  { name: "ShadowBlade", rank: "Diplomat", score: "8,900", chests: "1,540", lvl: "39", status: "Offline" },
  { name: "Stormcaller", rank: "Lieutenant", score: "8,420", chests: "1,460", lvl: "38", status: "Online" },
  { name: "Cerny", rank: "Diplomat", score: "7,800", chests: "1,320", lvl: "37", status: "Offline" },
  { name: "MoonKnight", rank: "Lieutenant", score: "7,500", chests: "1,280", lvl: "36", status: "Online" },
  { name: "BlazeFury", rank: "Member", score: "6,200", chests: "1,040", lvl: "35", status: "Offline" },
  { name: "TitanGuard", rank: "Member", score: "5,800", chests: "960", lvl: "34", status: "Online" },
];

export default function Page(): JSX.Element {
  return (
    <VariantShell config={cfg}>
      <div className="vs-content">
        <div className="vs-tabs">
          <div className="vs-tab act">Alle Mitglieder</div>
          <div className="vs-tab">Offiziere</div>
          <div className="vs-tab">Online</div>
        </div>

        <div className="vs-card vs-card-hl" style={{ marginBottom: 12 }}>
          <div style={{ padding: 0 }}>
            <div className="vs-stats">
              {[
                { v: "99/100", l: "Mitglieder" },
                { v: "8", l: "Offiziere" },
                { v: "45", l: "Online" },
                { v: "Lv 42", l: "Durchschnitt" },
              ].map((s) => (
                <div key={s.l} className="vs-stat">
                  <div className="vs-sv">{s.v}</div>
                  <div className="vs-sl">{s.l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="vs-card">
          <div className="vs-ch">
            <span className="vs-ct">Mitgliederliste</span>
          </div>
          <div style={{ padding: 0, overflowX: "auto" }}>
            <table className="vs-tbl">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Spieler</th>
                  <th>Rang</th>
                  <th>Score</th>
                  <th>Truhen</th>
                  <th>Level</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {MEMBERS.map((m, i) => (
                  <tr key={m.name}>
                    <td style={{ color: i < 3 ? "#cca848" : "#5c5650", fontWeight: i < 3 ? 600 : 400 }}>{i + 1}</td>
                    <td style={{ color: "#e0d8cc" }}>{m.name}</td>
                    <td>
                      <span className={`vs-badge${m.rank === "Ancient" ? " vs-badge-purple" : ""}`}>{m.rank}</span>
                    </td>
                    <td style={{ fontFamily: "'Fira Code',monospace", color: "#cca848" }}>{m.score}</td>
                    <td style={{ fontFamily: "'Fira Code',monospace" }}>{m.chests}</td>
                    <td>{m.lvl}</td>
                    <td>
                      <span
                        style={{
                          display: "inline-block",
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          background: m.status === "Online" ? "#4a9960" : "#5c5650",
                          marginRight: 4,
                          verticalAlign: "middle",
                        }}
                      />
                      <span style={{ fontSize: ".66rem", color: m.status === "Online" ? "#4a9960" : "#5c5650" }}>
                        {m.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </VariantShell>
  );
}
