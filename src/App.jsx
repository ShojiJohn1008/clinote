import { useState, useRef, useEffect, useCallback } from "react";

// ============================================================
// GAS APIのURL（デプロイしたURLに変更してください）
// ============================================================
const API_URL = "https://script.google.com/macros/s/AKfycbyNzr5tGNsCTSF_jLAUb_V9casMp1m4LxOwwNjti_NEzQYtkjVR001ay-2HkkjFBs4J/exec";

// ============================================================
// API helper（form-encodedでPOST → CORSエラーを回避）
// ============================================================
async function apiGet(path, params = {}) {
  const url = new URL(API_URL);
  url.searchParams.set("path", path);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString(), { redirect: "follow" });
  const json = await res.json();
  if (json.status >= 400) throw new Error(json.data?.error || "API error");
  return json.data;
}

async function apiPost(path, body = {}) {
  const form = new URLSearchParams();
  form.set("path", path);
  Object.entries(body).forEach(([k, v]) => form.set(k, String(v)));
  const res = await fetch(API_URL, {
    method: "POST",
    body: form,
    redirect: "follow",
  });
  const json = await res.json();
  if (json.status >= 400) throw new Error(json.data?.error || "API error");
  return json.data;
}

// ============================================================
// 定数
// ============================================================
const REACTION_OPTIONS = [
  { emoji: "👀", label: "気になる" },
  { emoji: "💡", label: "なるほど" },
];

const statusConfig = {
  dot:  { color: "#F97316", label: "疑問中", bg: "#FFF7ED", border: "#FED7AA" },
  half: { color: "#8B5CF6", label: "調査中", bg: "#F5F3FF", border: "#DDD6FE" },
  line: { color: "#3B82F6", label: "理解済", bg: "#EFF6FF", border: "#BFDBFE" },
};

function formatTime(iso) {
  if (!iso) return "";
  const diff = (Date.now() - new Date(iso)) / 1000;
  if (diff < 60) return "たった今";
  if (diff < 3600) return `${Math.floor(diff / 60)}分前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}時間前`;
  return `${Math.floor(diff / 86400)}日前`;
}

// ============================================================
// コンポーネント
// ============================================================
function ReactionBar({ reactions, postId, onReact }) {
  const [myReactions, setMyReactions] = useState({});
  const [animating, setAnimating] = useState({});

  const handleReact = (emoji) => {
    const adding = !myReactions[emoji];
    setMyReactions(p => ({ ...p, [emoji]: adding }));
    setAnimating(p => ({ ...p, [emoji]: true }));
    setTimeout(() => setAnimating(p => ({ ...p, [emoji]: false })), 300);
    onReact(postId, emoji, adding);
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
      <style>{`@keyframes emojiPop { 0%{transform:scale(1)} 40%{transform:scale(1.5)} 70%{transform:scale(0.88)} 100%{transform:scale(1)} }`}</style>
      {REACTION_OPTIONS.map(({ emoji, label }) => {
        const count = (reactions[emoji] || 0) + (myReactions[emoji] ? 1 : 0);
        const active = !!myReactions[emoji];
        return (
          <button key={emoji} onClick={(e) => { e.stopPropagation(); handleReact(emoji); }} style={{
            display: "flex", alignItems: "center", gap: 3, padding: "3px 9px", borderRadius: 20,
            border: active ? "1.5px solid #111827" : "1.5px solid #E5E7EB",
            background: active ? "#111827" : "white", color: active ? "white" : "#374151",
            fontSize: 12, fontWeight: 600, cursor: "pointer",
            transition: "background 0.15s, border-color 0.15s, color 0.15s",
          }}>
            <span style={{ fontSize: 13, display: "inline-block", animation: animating[emoji] ? "emojiPop 0.3s ease-out" : "none" }}>{emoji}</span>
            {count > 0 && <span>{count}</span>}
            <span style={{ fontSize: 11, color: active ? "rgba(255,255,255,0.8)" : "#9CA3AF" }}>{label}</span>
          </button>
        );
      })}
    </div>
  );
}

function PostCard({ post, onClick, onReact }) {
  const s = statusConfig[post.status] || statusConfig.dot;
  return (
    <div onClick={onClick} style={{ background: "white", borderRadius: 16, padding: 16, cursor: "pointer", border: "1px solid #F0F0F0", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
      <div style={{ display: "flex", gap: 10 }}>
        <div style={{ width: 9, height: 9, borderRadius: "50%", background: s.color, marginTop: 5, flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <p style={{ margin: "0 0 10px", fontSize: 14, lineHeight: 1.65, color: "#1F2937" }}>{post.content}</p>
          <div style={{ marginBottom: 10 }}>
            <ReactionBar reactions={post.reactions || {}} postId={post.id} onReact={onReact} />
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: s.color, background: s.bg, border: `1px solid ${s.border}`, padding: "2px 8px", borderRadius: 20 }}>{s.label}</span>
              <span style={{ fontSize: 12, color: "#9CA3AF" }}>{post.author} · {formatTime(post.createdAt)}</span>
            </div>
            {post.commentCount > 0 && <span style={{ fontSize: 12, color: "#6B7280" }}>💬 {post.commentCount}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// セットアップ画面（初回ログイン）
// ============================================================
function SetupScreen({ onComplete }) {
  const [step, setStep] = useState("name"); // name → team
  const [name, setName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [teamName, setTeamName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleNameSubmit = async () => {
    if (!name.trim()) return;
    setLoading(true);
    setError("");
    try {
      await apiPost("auth/login", { name: name.trim() });
      setStep("team");
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  const handleJoin = async () => {
    if (!inviteCode.trim()) return;
    setLoading(true);
    setError("");
    try {
      const data = await apiPost("team/join", { inviteCode: inviteCode.trim() });
      onComplete({ name, teamId: data.teamId, teamName: data.teamName });
    } catch (e) {
      setError("招待コードが正しくありません");
    }
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!teamName.trim()) return;
    setLoading(true);
    setError("");
    try {
      const data = await apiPost("team/create", { teamName: teamName.trim() });
      onComplete({ name, teamId: data.teamId, teamName: data.teamName, inviteCode: data.inviteCode });
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#F8F9FB", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 360 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: "linear-gradient(135deg, #F97316, #3B82F6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, margin: "0 auto 12px" }}>💡</div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#111827" }}>Clinote</h1>
          <p style={{ margin: "6px 0 0", fontSize: 14, color: "#6B7280" }}>チームの学びを蓄積する</p>
        </div>

        {step === "name" && (
          <div style={{ background: "white", borderRadius: 20, padding: 24, border: "1px solid #F0F0F0" }}>
            <p style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 600, color: "#111827" }}>あなたの名前を入力してください</p>
            <input
              value={name} onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleNameSubmit()}
              placeholder="例：山田 太郎"
              style={{ width: "100%", border: "1px solid #E5E7EB", borderRadius: 12, padding: "12px 14px", fontSize: 15, outline: "none", boxSizing: "border-box", marginBottom: 12, fontFamily: "inherit" }}
            />
            {error && <p style={{ color: "#EF4444", fontSize: 13, margin: "0 0 10px" }}>{error}</p>}
            <button onClick={handleNameSubmit} disabled={!name.trim() || loading} style={{ width: "100%", padding: "13px 0", background: name.trim() ? "#111827" : "#E5E7EB", color: name.trim() ? "white" : "#9CA3AF", border: "none", borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: name.trim() ? "pointer" : "default" }}>
              {loading ? "処理中..." : "次へ →"}
            </button>
          </div>
        )}

        {step === "team" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ background: "white", borderRadius: 20, padding: 24, border: "1px solid #F0F0F0" }}>
              <p style={{ margin: "0 0 4px", fontSize: 15, fontWeight: 600, color: "#111827" }}>チームに参加する</p>
              <p style={{ margin: "0 0 14px", fontSize: 13, color: "#6B7280" }}>招待コードを入力</p>
              <input
                value={inviteCode} onChange={e => setInviteCode(e.target.value.toUpperCase())}
                placeholder="例：ABC123"
                style={{ width: "100%", border: "1px solid #E5E7EB", borderRadius: 12, padding: "12px 14px", fontSize: 15, outline: "none", boxSizing: "border-box", marginBottom: 12, fontFamily: "inherit", letterSpacing: 2 }}
              />
              <button onClick={handleJoin} disabled={!inviteCode.trim() || loading} style={{ width: "100%", padding: "13px 0", background: inviteCode.trim() ? "#111827" : "#E5E7EB", color: inviteCode.trim() ? "white" : "#9CA3AF", border: "none", borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: inviteCode.trim() ? "pointer" : "default" }}>
                {loading ? "処理中..." : "参加する"}
              </button>
            </div>

            <div style={{ textAlign: "center", fontSize: 13, color: "#9CA3AF" }}>または</div>

            <div style={{ background: "white", borderRadius: 20, padding: 24, border: "1px solid #F0F0F0" }}>
              <p style={{ margin: "0 0 4px", fontSize: 15, fontWeight: 600, color: "#111827" }}>新しいチームを作る</p>
              <p style={{ margin: "0 0 14px", fontSize: 13, color: "#6B7280" }}>チーム名を入力</p>
              <input
                value={teamName} onChange={e => setTeamName(e.target.value)}
                placeholder="例：三重大学総合診療科"
                style={{ width: "100%", border: "1px solid #E5E7EB", borderRadius: 12, padding: "12px 14px", fontSize: 15, outline: "none", boxSizing: "border-box", marginBottom: 12, fontFamily: "inherit" }}
              />
              <button onClick={handleCreate} disabled={!teamName.trim() || loading} style={{ width: "100%", padding: "13px 0", background: teamName.trim() ? "#3B82F6" : "#E5E7EB", color: teamName.trim() ? "white" : "#9CA3AF", border: "none", borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: teamName.trim() ? "pointer" : "default" }}>
                {loading ? "処理中..." : "チームを作成"}
              </button>
            </div>
            {error && <p style={{ color: "#EF4444", fontSize: 13, textAlign: "center" }}>{error}</p>}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// メインアプリ
// ============================================================
export default function App() {
  const [user, setUser] = useState(null);         // { name, teamId, teamName, inviteCode? }
  const [appReady, setAppReady] = useState(false);

  const [screen, setScreen] = useState("home");
  const [tab, setTab] = useState("question");
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activePost, setActivePost] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState("");
  const [navTab, setNavTab] = useState("home");

  // 投稿フォーム
  const [postType, setPostType] = useState("question");
  const [postStatus, setPostStatus] = useState("dot");
  const [postContent, setPostContent] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [posting, setPosting] = useState(false);

  // スワイプ
  const swipeStart = useRef(null);
  const mouseStart = useRef(null);

  // 初回：localStorageから復元
  useEffect(() => {
    const saved = localStorage.getItem("clinote_user");
    if (saved) {
      setUser(JSON.parse(saved));
    }
    setAppReady(true);
  }, []);

  // 投稿取得
  const fetchPosts = useCallback(async () => {
    if (!user?.teamId) return;
    setLoading(true);
    try {
      const data = await apiGet("posts", { type: tab });
      setPosts(data.posts || []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, [user, tab]);

  useEffect(() => {
    if (screen === "home" && user?.teamId) fetchPosts();
  }, [screen, tab, user, fetchPosts]);

  const handleSetupComplete = (userData) => {
    setUser(userData);
    localStorage.setItem("clinote_user", JSON.stringify(userData));
  };

  // 投稿詳細を開く
  const openPost = async (post) => {
    setActivePost(post);
    setScreen("detail");
    setComments([]);
    try {
      const data = await apiGet("comments", { postId: post.id });
      setComments(data.comments || []);
    } catch (e) { console.error(e); }
  };

  const goHome = () => { setScreen("home"); setActivePost(null); setComments([]); };
  const handleHomeNav = () => { setNavTab("home"); setScreen("home"); setTab("question"); };

  // 投稿送信
  const handleSubmitPost = async () => {
    if (!postContent.trim() || posting) return;
    setPosting(true);
    try {
      await apiPost("posts", {
        type: postType,
        status: postType === "learning" ? postStatus : "dot",
        content: postContent.trim(),
        isAnonymous: isAnonymous,
      });
      setPostContent("");
      setScreen("home");
      await fetchPosts();
    } catch (e) {
      alert("投稿に失敗しました: " + e.message);
    }
    setPosting(false);
  };

  // コメント送信
  const handleSubmitComment = async () => {
    if (!commentText.trim() || !activePost) return;
    try {
      const data = await apiPost("comments", { postId: activePost.id, content: commentText.trim() });
      setComments(prev => [...prev, data]);
      setCommentText("");
      setPosts(prev => prev.map(p => p.id === activePost.id ? { ...p, commentCount: (p.commentCount || 0) + 1 } : p));
    } catch (e) {
      alert("コメントに失敗しました: " + e.message);
    }
  };

  // リアクション
  const handleReact = async (postId, emoji, adding) => {
    setPosts(prev => prev.map(p => {
      if (p.id !== postId) return p;
      const cur = p.reactions[emoji] || 0;
      const next = adding ? cur + 1 : Math.max(0, cur - 1);
      const r = { ...p.reactions };
      if (next === 0) delete r[emoji]; else r[emoji] = next;
      return { ...p, reactions: r };
    }));
    try {
      await apiPost("reactions", { postId, emoji });
    } catch (e) { console.error(e); }
  };

  // スワイプ
  const handleTouchStart = (e) => { swipeStart.current = e.touches[0].clientX; };
  const handleTouchEnd = (e) => {
    if (swipeStart.current === null) return;
    const dx = e.changedTouches[0].clientX - swipeStart.current;
    if (Math.abs(dx) > 50) {
      if (dx < 0 && tab === "question") setTab("learning");
      if (dx > 0 && tab === "learning") setTab("question");
    }
    swipeStart.current = null;
  };
  const handleMouseDown = (e) => { mouseStart.current = e.clientX; };
  const handleMouseUp = (e) => {
    if (mouseStart.current === null) return;
    const dx = e.clientX - mouseStart.current;
    if (Math.abs(dx) > 50) {
      if (dx < 0 && tab === "question") setTab("learning");
      if (dx > 0 && tab === "learning") setTab("question");
    }
    mouseStart.current = null;
  };

  if (!appReady) return null;
  if (!user) return <SetupScreen onComplete={handleSetupComplete} />;

  return (
    <div style={{ fontFamily: "'Hiragino Sans', 'Noto Sans JP', sans-serif", background: "#F8F9FB", minHeight: "100vh", maxWidth: 390, margin: "0 auto", display: "flex", flexDirection: "column", position: "relative" }}>

      {/* Header */}
      <div style={{ background: "white", borderBottom: "1px solid #F0F0F0", padding: "16px 20px 12px", display: "flex", alignItems: "center", gap: 12, position: "sticky", top: 0, zIndex: 10 }}>
        {screen === "detail" && <button onClick={goHome} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "#374151", padding: 0 }}>←</button>}
        {screen === "post" && <button onClick={() => setScreen("home")} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, color: "#6B7280" }}>キャンセル</button>}
        <div style={{ flex: 1 }}>
          {screen === "home" && (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: "linear-gradient(135deg, #F97316, #3B82F6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>💡</div>
              <span style={{ fontWeight: 700, fontSize: 17, color: "#111827" }}>Clinote</span>
            </div>
          )}
          {screen === "detail" && <span style={{ fontWeight: 600, fontSize: 16, color: "#111827" }}>投稿の詳細</span>}
          {screen === "post" && <span style={{ fontWeight: 600, fontSize: 16, color: "#111827", display: "block", textAlign: "center" }}>新しい投稿</span>}
          {screen === "search" && <span style={{ fontWeight: 600, fontSize: 16, color: "#111827" }}>検索</span>}
          {screen === "mypage" && <span style={{ fontWeight: 600, fontSize: 16, color: "#111827" }}>マイページ</span>}
        </div>
        {screen === "post" && (
          <button onClick={handleSubmitPost} disabled={!postContent.trim() || posting} style={{ background: postContent.trim() ? "#111827" : "#E5E7EB", color: postContent.trim() ? "white" : "#9CA3AF", border: "none", borderRadius: 20, padding: "6px 16px", fontSize: 14, fontWeight: 600, cursor: postContent.trim() ? "pointer" : "default" }}>
            {posting ? "投稿中..." : "投稿する"}
          </button>
        )}
      </div>

      {/* Home */}
      {screen === "home" && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ background: "white", padding: "0 20px", borderBottom: "1px solid #F0F0F0", flexShrink: 0 }}>
            <div style={{ display: "flex" }}>
              {[["question", "疑問"], ["learning", "学び"]].map(([key, label]) => (
                <button key={key} onClick={() => setTab(key)} style={{ flex: 1, padding: "14px 0", border: "none", background: "none", fontWeight: tab === key ? 700 : 400, color: tab === key ? "#111827" : "#9CA3AF", fontSize: 15, cursor: "pointer", borderBottom: tab === key ? "2.5px solid #111827" : "2.5px solid transparent", transition: "color 0.15s, border-color 0.15s" }}>{label}</button>
              ))}
            </div>
          </div>

          <div style={{ flex: 1, overflowY: "auto", paddingBottom: 80, userSelect: "none" }} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} onMouseDown={handleMouseDown} onMouseUp={handleMouseUp}>
            {loading ? (
              <div style={{ textAlign: "center", padding: 40, color: "#9CA3AF", fontSize: 14 }}>読み込み中...</div>
            ) : posts.length === 0 ? (
              <div style={{ textAlign: "center", padding: 40, color: "#9CA3AF", fontSize: 14, lineHeight: 1.8 }}>
                まだ投稿がありません<br />＋ボタンから最初の投稿をしてみましょう
              </div>
            ) : (
              <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
                {posts.map(post => (
                  <PostCard key={post.id} post={post} onClick={() => openPost(post)} onReact={handleReact} />
                ))}
              </div>
            )}
            <p style={{ textAlign: "center", fontSize: 12, color: "#E5E7EB", marginTop: 8, paddingBottom: 8 }}>← スワイプで切り替え →</p>
          </div>
        </div>
      )}

      {/* Detail */}
      {screen === "detail" && activePost && (
        <div style={{ flex: 1, overflowY: "auto", paddingBottom: 120 }}>
          <div style={{ padding: 16 }}>
            <div style={{ background: "white", borderRadius: 16, padding: 16, border: "1px solid #F0F0F0", marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <div style={{ width: 9, height: 9, borderRadius: "50%", background: statusConfig[activePost.status]?.color || "#F97316" }} />
                <span style={{ fontSize: 11, fontWeight: 600, color: statusConfig[activePost.status]?.color, background: statusConfig[activePost.status]?.bg, border: `1px solid ${statusConfig[activePost.status]?.border}`, padding: "2px 8px", borderRadius: 20 }}>{statusConfig[activePost.status]?.label}</span>
              </div>
              <p style={{ margin: "0 0 12px", fontSize: 15, lineHeight: 1.7, color: "#1F2937" }}>{activePost.content}</p>
              <div style={{ marginBottom: 12 }}>
                <ReactionBar reactions={activePost.reactions || {}} postId={activePost.id} onReact={handleReact} />
              </div>
              <span style={{ fontSize: 12, color: "#9CA3AF" }}>{activePost.author} · {formatTime(activePost.createdAt)}</span>
            </div>

            <div style={{ marginLeft: 20, borderLeft: "2px solid #E5E7EB", paddingLeft: 16, display: "flex", flexDirection: "column", gap: 8 }}>
              {comments.length === 0 && <p style={{ color: "#9CA3AF", fontSize: 13, padding: "8px 0" }}>まだ回答がありません。最初に答えてみませんか？</p>}
              {comments.map(c => (
                <div key={c.id} style={{ background: "white", borderRadius: 14, padding: 14, border: "1px solid #F0F0F0" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                    <div style={{ width: 24, height: 24, borderRadius: "50%", background: "linear-gradient(135deg, #667eea, #764ba2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "white", fontWeight: 600 }}>{c.author[0]}</div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>{c.author}</span>
                    <span style={{ fontSize: 11, color: "#9CA3AF" }}>{formatTime(c.createdAt)}</span>
                  </div>
                  <p style={{ margin: 0, fontSize: 14, lineHeight: 1.65, color: "#374151" }}>{c.content}</p>
                </div>
              ))}
            </div>
          </div>

          <div style={{ position: "fixed", bottom: 60, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 390, background: "white", borderTop: "1px solid #F0F0F0", padding: "10px 16px" }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input value={commentText} onChange={e => setCommentText(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSubmitComment()} placeholder="返信を入力..." style={{ flex: 1, border: "1px solid #E5E7EB", borderRadius: 20, padding: "10px 14px", fontSize: 14, outline: "none", background: "#F9FAFB", fontFamily: "inherit" }} />
              <button onClick={handleSubmitComment} disabled={!commentText.trim()} style={{ background: commentText.trim() ? "#111827" : "#E5E7EB", color: commentText.trim() ? "white" : "#9CA3AF", border: "none", borderRadius: 20, padding: "10px 16px", fontSize: 13, fontWeight: 600, cursor: commentText.trim() ? "pointer" : "default" }}>送信</button>
            </div>
          </div>
        </div>
      )}

      {/* Post */}
      {screen === "post" && (
        <div style={{ flex: 1, padding: 16, display: "flex", flexDirection: "column", gap: 16, overflowY: "auto", paddingBottom: 80 }}>
          <div style={{ background: "white", borderRadius: 14, padding: 4, display: "flex", border: "1px solid #F0F0F0" }}>
            {[["question", "疑問"], ["learning", "学び"]].map(([key, label]) => (
              <button key={key} onClick={() => setPostType(key)} style={{ flex: 1, padding: "10px 0", border: "none", cursor: "pointer", borderRadius: 10, fontSize: 14, fontWeight: 600, transition: "all 0.15s", background: postType === key ? "#111827" : "transparent", color: postType === key ? "white" : "#9CA3AF" }}>{label}</button>
            ))}
          </div>
          <div style={{ background: "white", borderRadius: 14, border: "1px solid #F0F0F0" }}>
            <textarea value={postContent} onChange={e => setPostContent(e.target.value)} placeholder={postType === "question" ? "今日気になったこと、わからなかったことをつぶやく..." : "調べたこと、気づいたことをメモする..."} style={{ width: "100%", minHeight: 140, border: "none", outline: "none", padding: 16, fontSize: 15, lineHeight: 1.7, resize: "none", fontFamily: "inherit", color: "#1F2937", boxSizing: "border-box", borderRadius: 14 }} />
          </div>
          {postType === "learning" && (
            <div style={{ background: "white", borderRadius: 14, padding: 16, border: "1px solid #F0F0F0" }}>
              <p style={{ margin: "0 0 10px", fontSize: 13, color: "#6B7280", fontWeight: 600 }}>理解度</p>
              <div style={{ display: "flex", gap: 8 }}>
                {[["dot", "🟠 調べた"], ["half", "🟣 途中"], ["line", "🔵 理解した"]].map(([key, label]) => (
                  <button key={key} onClick={() => setPostStatus(key)} style={{ flex: 1, padding: "8px 4px", border: `1px solid ${postStatus === key ? statusConfig[key].color : "#E5E7EB"}`, borderRadius: 10, fontSize: 11, fontWeight: 600, cursor: "pointer", background: postStatus === key ? statusConfig[key].bg : "white", color: postStatus === key ? statusConfig[key].color : "#9CA3AF", transition: "all 0.15s" }}>{label}</button>
                ))}
              </div>
            </div>
          )}
          <div style={{ background: "white", borderRadius: 14, padding: "14px 16px", border: "1px solid #F0F0F0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#1F2937" }}>{isAnonymous ? "匿名で投稿" : "実名で投稿"}</p>
              <p style={{ margin: "2px 0 0", fontSize: 12, color: "#9CA3AF" }}>{isAnonymous ? "名前は表示されません" : "あなたの名前が表示されます"}</p>
            </div>
            <button onClick={() => setIsAnonymous(!isAnonymous)} style={{ width: 48, height: 28, borderRadius: 14, border: "none", cursor: "pointer", background: isAnonymous ? "#D1D5DB" : "#111827", position: "relative", transition: "background 0.25s" }}>
              <div style={{ position: "absolute", top: 3, left: isAnonymous ? 3 : 23, width: 22, height: 22, borderRadius: "50%", background: "white", transition: "left 0.25s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
            </button>
          </div>
        </div>
      )}

      {/* Search */}
      {screen === "search" && (
        <div style={{ flex: 1, padding: 16 }}>
          <div style={{ background: "white", borderRadius: 14, border: "1px solid #F0F0F0", display: "flex", alignItems: "center", gap: 10, padding: "12px 16px" }}>
            <span style={{ fontSize: 16 }}>🔍</span>
            <input placeholder="疾患名・キーワードで検索..." style={{ border: "none", outline: "none", flex: 1, fontSize: 15, fontFamily: "inherit" }} />
          </div>
          <p style={{ color: "#9CA3AF", fontSize: 13, textAlign: "center", marginTop: 48, lineHeight: 1.8 }}>チームの学びが溜まってくると<br />ここで引き出せるようになります</p>
        </div>
      )}

      {/* MyPage */}
      {screen === "mypage" && (
        <div style={{ flex: 1, padding: 16, paddingBottom: 80, overflowY: "auto" }}>
          <div style={{ background: "white", borderRadius: 16, padding: 20, border: "1px solid #F0F0F0", marginBottom: 16, textAlign: "center" }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", margin: "0 auto 12px", background: "linear-gradient(135deg, #F97316, #3B82F6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>👤</div>
            <p style={{ margin: "0 0 4px", fontWeight: 700, fontSize: 16, color: "#111827" }}>{user.name}</p>
            <p style={{ margin: "0 0 12px", fontSize: 13, color: "#9CA3AF" }}>{user.teamName || "チーム未設定"}</p>
            {user.inviteCode && (
              <div style={{ background: "#F8F9FB", borderRadius: 12, padding: "10px 16px", display: "inline-block" }}>
                <p style={{ margin: "0 0 4px", fontSize: 11, color: "#9CA3AF" }}>招待コード</p>
                <p style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#111827", letterSpacing: 3 }}>{user.inviteCode}</p>
              </div>
            )}
          </div>
          <div style={{ background: "white", borderRadius: 14, border: "1px solid #F0F0F0" }}>
            <button onClick={() => { localStorage.removeItem("clinote_user"); setUser(null); }} style={{ width: "100%", padding: "14px 16px", border: "none", background: "none", cursor: "pointer", fontSize: 14, color: "#EF4444", textAlign: "left" }}>ログアウト</button>
          </div>
        </div>
      )}

      {/* FAB */}
      {screen === "home" && (
        <button onClick={() => setScreen("post")} style={{ position: "fixed", bottom: 76, right: "calc(50% - 195px + 16px)", width: 52, height: 52, borderRadius: "50%", background: "#111827", color: "white", border: "none", fontSize: 24, cursor: "pointer", boxShadow: "0 4px 16px rgba(0,0,0,0.2)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 20 }}>＋</button>
      )}

      {/* Bottom Nav */}
      <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 390, background: "white", borderTop: "1px solid #F0F0F0", display: "flex", zIndex: 30 }}>
        {[
          ["home", "🏠", "ホーム", handleHomeNav],
          ["search", "🔍", "検索", () => { setNavTab("search"); setScreen("search"); }],
          ["notify", "🔔", "通知", () => { setNavTab("notify"); }],
          ["mypage", "👤", "マイページ", () => { setNavTab("mypage"); setScreen("mypage"); }],
        ].map(([key, icon, label, handler]) => (
          <button key={key} onClick={handler} style={{ flex: 1, padding: "10px 0", border: "none", background: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
            <span style={{ fontSize: 20 }}>{icon}</span>
            <span style={{ fontSize: 10, color: navTab === key ? "#111827" : "#9CA3AF", fontWeight: navTab === key ? 700 : 400 }}>{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
