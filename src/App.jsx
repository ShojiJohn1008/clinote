import { useState, useRef } from "react";
const API_URL = "https://script.google.com/macros/s/AKfycbxAX4xSOroOd2UQmtrPIMoxmAzPE5O3-4C9rrBkTmk3JucTo2pbr1Chp2hchHBRaqee/exec";
const POSTS_DATA = [
  {
    id: 1, type: "question", status: "dot",
    content: "低カリウム血症の患者さん、K値2.8で症状なし。経口補充だけでいい？",
    author: "匿名", time: "14分前",
    reactions: { "👀": 3, "💡": 1 },
    comments: [
      { id: 1, author: "田中先生", content: "症状がなければ経口補充で十分です。点滴は2.5以下か症状ありの場合が目安です。", time: "10分前" },
      { id: 2, author: "匿名", content: "UpToDate「Causes of hypokalemia in adults」に補充速度の目安が載っています。", time: "8分前" },
    ],
  },
  {
    id: 2, type: "learning", status: "line",
    content: "PET検査の1週間前に内視鏡をやってはいけない理由がわかった。偽陽性の可能性があるため2日以上あける必要がある。",
    author: "山田", time: "1時間前",
    reactions: { "💡": 5, "👀": 2 },
    comments: [
      { id: 1, author: "佐藤先生", content: "造影剤を使う検査も影響することがあります。施設によってプロトコルが違うので確認を。", time: "45分前" },
    ],
  },
  {
    id: 3, type: "question", status: "dot",
    content: "低Na血症の補正速度、24時間で何mEq/Lまで？慢性と急性で違う気がするんだけど確認したい。",
    author: "匿名", time: "3時間前",
    reactions: { "👀": 7, "💡": 2 },
    comments: [],
  },
  {
    id: 4, type: "learning", status: "half",
    content: "HbA1cと平均血糖の換算式。AG (mg/dL) = 28.7 × HbA1c − 46.7。まだ臨床でどう使うか消化中。",
    author: "鈴木", time: "昨日",
    reactions: { "💡": 2 },
    comments: [
      { id: 1, author: "田中先生", content: "CGMのデータと比較すると面白いですよ。HbA1cだけでは見えない血糖変動が見えてきます。", time: "昨日" },
    ],
  },
  {
    id: 5, type: "question", status: "dot",
    content: "SpO2が90%台前半の患者さん、酸素投与の目標値ってどこ？COPDの場合は違う？",
    author: "匿名", time: "昨日",
    reactions: { "👀": 5 },
    comments: [],
  },
];

const REACTION_OPTIONS = [
  { emoji: "👀", label: "気になる" },
  { emoji: "💡", label: "なるほど" },
];

const statusConfig = {
  dot:  { color: "#F97316", label: "疑問中", bg: "#FFF7ED", border: "#FED7AA" },
  half: { color: "#8B5CF6", label: "調査中", bg: "#F5F3FF", border: "#DDD6FE" },
  line: { color: "#3B82F6", label: "理解済", bg: "#EFF6FF", border: "#BFDBFE" },
};

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
      <style>{`
        @keyframes emojiPop {
          0%   { transform: scale(1); }
          40%  { transform: scale(1.5); }
          70%  { transform: scale(0.88); }
          100% { transform: scale(1); }
        }
      `}</style>
      {REACTION_OPTIONS.map(({ emoji, label }) => {
        const count = (reactions[emoji] || 0) + (myReactions[emoji] ? 1 : 0);
        const active = !!myReactions[emoji];
        return (
          <button key={emoji} onClick={(e) => { e.stopPropagation(); handleReact(emoji); }} style={{
            display: "flex", alignItems: "center", gap: 3,
            padding: "3px 9px", borderRadius: 20,
            border: active ? "1.5px solid #111827" : "1.5px solid #E5E7EB",
            background: active ? "#111827" : "white",
            color: active ? "white" : "#374151",
            fontSize: 12, fontWeight: 600, cursor: "pointer",
            transition: "background 0.15s, border-color 0.15s, color 0.15s",
          }}>
            <span style={{
              fontSize: 13,
              display: "inline-block",
              animation: animating[emoji] ? "emojiPop 0.3s ease-out" : "none",
            }}>{emoji}</span>
            {count > 0 && <span>{count}</span>}
            <span style={{ fontSize: 11, color: active ? "rgba(255,255,255,0.8)" : "#9CA3AF" }}>{label}</span>
          </button>
        );
      })}
    </div>
  );
}

function PostCard({ post, onClick, onReact }) {
  const s = statusConfig[post.status];
  return (
    <div onClick={onClick} style={{
      background: "white", borderRadius: 16, padding: 16,
      cursor: "pointer", border: "1px solid #F0F0F0",
      boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
    }}>
      <div style={{ display: "flex", gap: 10 }}>
        <div style={{ width: 9, height: 9, borderRadius: "50%", background: s.color, marginTop: 5, flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <p style={{ margin: "0 0 10px", fontSize: 14, lineHeight: 1.65, color: "#1F2937" }}>{post.content}</p>
          <div style={{ marginBottom: 10 }}>
            <ReactionBar reactions={post.reactions} postId={post.id} onReact={onReact} />
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: s.color, background: s.bg, border: `1px solid ${s.border}`, padding: "2px 8px", borderRadius: 20 }}>{s.label}</span>
              <span style={{ fontSize: 12, color: "#9CA3AF" }}>{post.author} · {post.time}</span>
            </div>
            {post.comments.length > 0 && <span style={{ fontSize: 12, color: "#6B7280" }}>💬 {post.comments.length}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [screen, setScreen] = useState("home");
  const [tab, setTab] = useState("question");
  const [activePost, setActivePost] = useState(null);
  const [navTab, setNavTab] = useState("home");
  const [postType, setPostType] = useState("question");
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [postStatus, setPostStatus] = useState("dot");
  const [posts, setPosts] = useState(POSTS_DATA);

  // Swipe handling
  const swipeStart = useRef(null);
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
  // Mouse swipe for desktop preview
  const mouseStart = useRef(null);
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

  const handleReact = (postId, emoji, adding) => {
    setPosts(prev => prev.map(p => {
      if (p.id !== postId) return p;
      const cur = p.reactions[emoji] || 0;
      const next = adding ? cur + 1 : Math.max(0, cur - 1);
      const r = { ...p.reactions };
      if (next === 0) delete r[emoji]; else r[emoji] = next;
      return { ...p, reactions: r };
    }));
  };

  const openPost = (post) => { setActivePost(post); setScreen("detail"); };
  const goHome = () => { setScreen("home"); setActivePost(null); };

  const handleHomeNav = () => {
    setNavTab("home");
    setScreen("home");
    setTab("question"); // always reset to 疑問
  };

  const filteredPosts = posts.filter(p => p.type === tab);

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
              <span style={{ fontWeight: 700, fontSize: 17, color: "#111827", letterSpacing: "-0.3px" }}>Clinote</span>
            </div>
          )}
          {screen === "detail" && <span style={{ fontWeight: 600, fontSize: 16, color: "#111827" }}>投稿の詳細</span>}
          {screen === "post" && <span style={{ fontWeight: 600, fontSize: 16, color: "#111827", display: "block", textAlign: "center" }}>新しい投稿</span>}
          {screen === "search" && <span style={{ fontWeight: 600, fontSize: 16, color: "#111827" }}>検索</span>}
          {screen === "mypage" && <span style={{ fontWeight: 600, fontSize: 16, color: "#111827" }}>マイページ</span>}
        </div>
        {screen === "post" && (
          <button onClick={() => setScreen("home")} style={{ background: "#111827", color: "white", border: "none", borderRadius: 20, padding: "6px 16px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>投稿する</button>
        )}
      </div>

      {/* Home */}
      {screen === "home" && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {/* Tab bar */}
          <div style={{ background: "white", padding: "0 20px", borderBottom: "1px solid #F0F0F0", flexShrink: 0 }}>
            <div style={{ display: "flex" }}>
              {[["question", "疑問"], ["learning", "学び"]].map(([key, label]) => (
                <button key={key} onClick={() => setTab(key)} style={{
                  flex: 1, padding: "14px 0", border: "none", background: "none",
                  fontWeight: tab === key ? 700 : 400,
                  color: tab === key ? "#111827" : "#9CA3AF",
                  fontSize: 15, cursor: "pointer",
                  borderBottom: tab === key ? "2.5px solid #111827" : "2.5px solid transparent",
                  transition: "color 0.15s, border-color 0.15s",
                }}>{label}</button>
              ))}
            </div>
          </div>

          {/* Swipeable post list */}
          <div
            style={{ flex: 1, overflowY: "auto", paddingBottom: 80, userSelect: "none" }}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
          >
            <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
              {filteredPosts.map((post) => (
                <PostCard key={post.id} post={post} onClick={() => openPost(post)} onReact={handleReact} />
              ))}
            </div>
            <p style={{ textAlign: "center", fontSize: 12, color: "#D1D5DB", marginTop: 8, paddingBottom: 8 }}>
              ← スワイプで切り替え →
            </p>
          </div>
        </div>
      )}

      {/* Detail */}
      {screen === "detail" && activePost && (
        <div style={{ flex: 1, overflowY: "auto", paddingBottom: 120 }}>
          <div style={{ padding: 16 }}>
            <div style={{ background: "white", borderRadius: 16, padding: 16, border: "1px solid #F0F0F0", marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <div style={{ width: 9, height: 9, borderRadius: "50%", background: statusConfig[activePost.status].color }} />
                <span style={{ fontSize: 11, fontWeight: 600, color: statusConfig[activePost.status].color, background: statusConfig[activePost.status].bg, border: `1px solid ${statusConfig[activePost.status].border}`, padding: "2px 8px", borderRadius: 20 }}>{statusConfig[activePost.status].label}</span>
              </div>
              <p style={{ margin: "0 0 12px", fontSize: 15, lineHeight: 1.7, color: "#1F2937" }}>{activePost.content}</p>
              <div style={{ marginBottom: 12 }}>
                <ReactionBar reactions={activePost.reactions} postId={activePost.id} onReact={handleReact} />
              </div>
              <span style={{ fontSize: 12, color: "#9CA3AF" }}>{activePost.author} · {activePost.time}</span>
            </div>

            <div style={{ marginLeft: 20, borderLeft: "2px solid #E5E7EB", paddingLeft: 16, display: "flex", flexDirection: "column", gap: 8 }}>
              {activePost.comments.length === 0 && (
                <p style={{ color: "#9CA3AF", fontSize: 13, padding: "8px 0" }}>まだ回答がありません。最初に答えてみませんか？</p>
              )}
              {activePost.comments.map((c) => (
                <div key={c.id} style={{ background: "white", borderRadius: 14, padding: 14, border: "1px solid #F0F0F0" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                    <div style={{ width: 24, height: 24, borderRadius: "50%", background: c.author === "匿名" ? "#F3F4F6" : "linear-gradient(135deg, #667eea, #764ba2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: c.author === "匿名" ? "#6B7280" : "white", fontWeight: 600 }}>{c.author === "匿名" ? "?" : c.author[0]}</div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>{c.author}</span>
                    <span style={{ fontSize: 11, color: "#9CA3AF" }}>{c.time}</span>
                  </div>
                  <p style={{ margin: 0, fontSize: 14, lineHeight: 1.65, color: "#374151" }}>{c.content}</p>
                </div>
              ))}
            </div>
          </div>

          <div style={{ position: "fixed", bottom: 60, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 390, background: "white", borderTop: "1px solid #F0F0F0", padding: "10px 16px" }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input placeholder="返信を入力..." style={{ flex: 1, border: "1px solid #E5E7EB", borderRadius: 20, padding: "10px 14px", fontSize: 14, outline: "none", background: "#F9FAFB", fontFamily: "inherit" }} />
              <button style={{ background: "#111827", color: "white", border: "none", borderRadius: 20, padding: "10px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>送信</button>
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
            <textarea placeholder={postType === "question" ? "今日気になったこと、わからなかったことをつぶやく..." : "調べたこと、気づいたことをメモする..."} style={{ width: "100%", minHeight: 140, border: "none", outline: "none", padding: 16, fontSize: 15, lineHeight: 1.7, resize: "none", fontFamily: "inherit", color: "#1F2937", boxSizing: "border-box", borderRadius: 14 }} />
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
            <p style={{ margin: "0 0 4px", fontWeight: 700, fontSize: 16, color: "#111827" }}>山田 太郎</p>
            <p style={{ margin: 0, fontSize: 13, color: "#9CA3AF" }}>総合診療科 研修医1年目</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            {[["4", "疑問投稿", "#F97316"], ["2", "学び投稿", "#3B82F6"], ["6", "コメント", "#8B5CF6"]].map(([num, label, color]) => (
              <div key={label} style={{ background: "white", borderRadius: 14, padding: "14px 10px", border: "1px solid #F0F0F0", textAlign: "center" }}>
                <p style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 700, color }}>{num}</p>
                <p style={{ margin: 0, fontSize: 11, color: "#9CA3AF" }}>{label}</p>
              </div>
            ))}
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
