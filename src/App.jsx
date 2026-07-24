import React, { useState, useEffect, useRef, useCallback } from "react";

const MODEL = "claude-sonnet-5";
const MAX_IMAGES = 6;
const MAX_MY_IMAGES = 6;
const MAX_DIM = 1100;

const FONTS = `
@import url('https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;0,6..72,600;1,6..72,500&family=Plus+Jakarta+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
.hinge-scout-root * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
.hinge-scout-root button { touch-action: manipulation; }
.hinge-scout-root textarea, .hinge-scout-root input { font-size: 16px; }
`;

const COLORS = {
  ink: "#1A1A1A", // Hinge Black
  paper: "#FFFEFD", // Hinge White
  paperDim: "#F2F1EC", // léger contraste sur fond blanc
  line: "#E1DED6",
  muted: "#666666", // Dove Gray
  brass: "#B8892F",
  green: "#71904A", // vert inspiré de "Kohlrabi"
  red: "#9C4A3C",
  cream: "#FAF9F6",
};

function extractJsonObject(text) {
  if (!text) return null;
  const start = text.indexOf("{");
  if (start === -1) return null;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === "\\") {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }
    if (ch === '"') {
      inString = true;
    } else if (ch === "{") {
      depth++;
    } else if (ch === "}") {
      depth--;
      if (depth === 0) {
        return text.slice(start, i + 1);
      }
    }
  }
  return null; // dépassé la fin du texte sans fermer : probablement tronqué
}

function resizeImageFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Lecture du fichier impossible"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Image illisible"));
      img.onload = () => {
        let { width, height } = img;
        if (width > MAX_DIM || height > MAX_DIM) {
          if (width > height) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          } else {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
        resolve({
          dataUrl,
          base64: dataUrl.split(",")[1],
          mediaType: "image/jpeg",
        });
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function ScoreDial({ score }) {
  const clamped = Math.max(0, Math.min(100, score));
  const deg = ((clamped - 50) / 50) * 90;
  const color =
    clamped >= 70 ? COLORS.green : clamped >= 45 ? COLORS.brass : COLORS.red;
  return (
    <svg viewBox="0 0 200 122" style={{ width: 150, maxWidth: "42vw", height: "auto" }}>
      <path
        d="M20,110 A80,80 0 0 1 180,110"
        fill="none"
        stroke={COLORS.line}
        strokeWidth="12"
        strokeLinecap="round"
      />
      <path
        d="M20,110 A80,80 0 0 1 180,110"
        fill="none"
        stroke={color}
        strokeWidth="12"
        strokeLinecap="round"
        pathLength="100"
        strokeDasharray={`${clamped} 100`}
      />
      {[0, 25, 50, 75, 100].map((t) => {
        const a = ((t - 50) / 50) * 90 * (Math.PI / 180);
        const x1 = 100 + Math.sin(a) * 68;
        const y1 = 110 - Math.cos(a) * 68;
        const x2 = 100 + Math.sin(a) * 78;
        const y2 = 110 - Math.cos(a) * 78;
        return (
          <line
            key={t}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={COLORS.muted}
            strokeWidth="2"
          />
        );
      })}
      <g transform={`rotate(${deg} 100 110)`}>
        <line
          x1="100"
          y1="110"
          x2="100"
          y2="42"
          stroke={COLORS.ink}
          strokeWidth="3"
          strokeLinecap="round"
        />
      </g>
      <circle cx="100" cy="110" r="6" fill={COLORS.ink} />
      <text
        x="100"
        y="100"
        textAnchor="middle"
        fontFamily="IBM Plex Mono, monospace"
        fontSize="26"
        fontWeight="600"
        fill={COLORS.ink}
      >
        {clamped}
      </text>
    </svg>
  );
}

function Stamp({ recommandation }) {
  const map = {
    match: { label: "Match", color: COLORS.green },
    mitige: { label: "À considérer", color: COLORS.brass },
    pass: { label: "Pass", color: COLORS.red },
  };
  const cfg = map[recommandation] || map.mitige;
  return (
    <div
      style={{
        display: "inline-block",
        background: cfg.color,
        borderRadius: 999,
        padding: "6px 14px",
        color: COLORS.paper,
        fontFamily: "Plus Jakarta Sans, sans-serif",
        fontWeight: 700,
        fontSize: 12.5,
        whiteSpace: "nowrap",
      }}
    >
      {cfg.label}
    </div>
  );
}

function Tab({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        minWidth: 0,
        fontFamily: "Plus Jakarta Sans, sans-serif",
        fontSize: 13,
        padding: "14px 6px",
        border: "none",
        borderBottom: active ? `2px solid ${COLORS.ink}` : "2px solid transparent",
        background: "transparent",
        color: active ? COLORS.ink : COLORS.muted,
        cursor: "pointer",
        fontWeight: active ? 700 : 500,
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
      }}
    >
      {children}
    </button>
  );
}

function Dropzone({ onFiles, label, inputRef, hint }) {
  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        if (e.dataTransfer.files) onFiles(e.dataTransfer.files);
      }}
      style={{
        border: `1.5px dashed ${COLORS.line}`,
        borderRadius: 18,
        padding: 16,
        textAlign: "center",
        background: COLORS.cream,
        marginBottom: 10,
      }}
    >
      <div style={{ color: COLORS.muted, fontSize: 13, marginBottom: 12 }}>{label}</div>
      <div style={{ position: "relative", display: "inline-block" }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            fontFamily: "Plus Jakarta Sans, sans-serif",
            fontWeight: 600,
            fontSize: 14,
            padding: "13px 22px",
            background: COLORS.ink,
            color: COLORS.paper,
            border: "none",
            borderRadius: 999,
          }}
        >
          <span style={{ fontSize: 16, lineHeight: 1 }}>+</span>
          Ajouter une image
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            opacity: 0,
            cursor: "pointer",
          }}
          onChange={(e) => onFiles(e.target.files)}
        />
      </div>
      {hint && (
        <div style={{ fontSize: 11, marginTop: 10, color: "#9C947A" }}>{hint}</div>
      )}
    </div>
  );
}

function ImageThumbs({ images, onRemove }) {
  if (!images || images.length === 0) return null;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
      {images.map((im) => (
        <div key={im.id} style={{ position: "relative" }}>
          <img
            src={im.dataUrl || `data:${im.mediaType};base64,${im.base64}`}
            alt="capture"
            style={{
              width: 76,
              height: 76,
              objectFit: "cover",
              borderRadius: 14,
              border: `1px solid ${COLORS.line}`,
            }}
          />
          <button
            onClick={() => onRemove(im.id)}
            style={{
              position: "absolute",
              top: -8,
              right: -8,
              width: 28,
              height: 28,
              borderRadius: "50%",
              border: `2px solid ${COLORS.cream}`,
              background: COLORS.red,
              color: COLORS.cream,
              fontSize: 15,
              lineHeight: "24px",
              cursor: "pointer",
            }}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

function Accordion({ title, defaultOpen = false, accent, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div
      style={{
        border: `1px solid ${COLORS.line}`,
        borderRadius: 16,
        marginBottom: 10,
        overflow: "hidden",
      }}
    >
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: "100%",
          textAlign: "left",
          padding: "13px 16px",
          background: accent || COLORS.paperDim,
          border: "none",
          cursor: "pointer",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontFamily: "Plus Jakarta Sans, sans-serif",
          fontSize: 13.5,
          fontWeight: 600,
          color: COLORS.ink,
        }}
      >
        <span>{title}</span>
        <span>{open ? "−" : "+"}</span>
      </button>
      {open && (
        <div style={{ padding: 16, background: COLORS.paper, fontSize: 13.5, lineHeight: 1.55 }}>
          {children}
        </div>
      )}
    </div>
  );
}

function OpenerLine({ text, onCopy, copied }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 10,
        border: `1px solid ${COLORS.line}`,
        borderRadius: 14,
        padding: "10px 14px",
        background: COLORS.cream,
        fontSize: 13.5,
      }}
    >
      <span style={{ flex: 1, minWidth: 0 }}>{text}</span>
      <button
        onClick={onCopy}
        style={{
          flexShrink: 0,
          fontFamily: "Plus Jakarta Sans, sans-serif",
          fontWeight: 600,
          fontSize: 12,
          padding: "8px 14px",
          border: "none",
          background: copied ? COLORS.ink : COLORS.paperDim,
          color: copied ? COLORS.paper : COLORS.ink,
          borderRadius: 999,
          cursor: "pointer",
          whiteSpace: "nowrap",
        }}
      >
        {copied ? "copié" : "copier"}
      </button>
    </div>
  );
}

const POTENTIEL_LABELS = {
  partenaire_potentielle: "Vraie partenaire potentielle",
  aventure: "Plutôt une aventure",
  probablement_indisponible: "Probablement indisponible",
  juste_des_matchs: "Cherche juste des matchs",
  tres_compatible: "Très compatible",
};

const REPONSE_MAP = { oui: "match", oui_si_accroche: "mitige", non: "pass" };

function ResultReport({ result }) {
  const [copiedKey, setCopiedKey] = useState(null);

  function copy(text, key) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1500);
    }
  }

  const noteGlobale = result?.notes_finales?.note_globale ?? (result?.score ? result.score / 10 : 0);
  const score = Math.round(noteGlobale * 10);
  const recommandation = REPONSE_MAP[result?.je_likerais?.reponse] || result?.recommandation || "mitige";

  const attractLabels = {
    visage: "Visage",
    sourire: "Sourire",
    regard: "Regard",
    style: "Style",
    naturel: "Naturel",
    elegance: "Élégance",
    sex_appeal: "Sex-appeal",
  };
  const compatLabels = {
    humour: "Humour",
    curiosite: "Curiosité",
    intelligence: "Intelligence",
    stabilite_emotionnelle: "Stabilité émotionnelle",
    valeurs: "Valeurs",
    style_de_vie: "Style de vie",
    rythme_de_vie: "Rythme de vie",
    communication: "Communication",
    envie_de_construire: "Envie de construire quelque chose",
  };

  return (
    <div style={{ marginTop: 24 }}>
      <div
        style={{
          border: `1px solid ${COLORS.line}`,
          borderRadius: 18,
          padding: 20,
          background: COLORS.cream,
          marginBottom: 14,
        }}
      >
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap", alignItems: "center" }}>
          <ScoreDial score={score} />
          <div style={{ flex: 1, minWidth: 140 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
              <div style={{ fontFamily: "Newsreader, serif", fontSize: 20 }}>{result.prenom}</div>
              <Stamp recommandation={recommandation} />
            </div>
            {result.probabilite_match && (
              <div style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 12, color: COLORS.muted }}>
                Probabilité de match estimée : {result.probabilite_match.pourcentage}%
              </div>
            )}
          </div>
        </div>
        {result.elements_manquants && (
          <div style={{ marginTop: 12, fontSize: 12, color: COLORS.brass, fontStyle: "italic" }}>
            ⚠ {result.elements_manquants}
          </div>
        )}
      </div>

      {result.premiere_impression && (
        <Accordion title="1 · Première impression" defaultOpen>
          {result.premiere_impression.histoire && (
            <div style={{ marginBottom: 8 }}>
              <b>Ce que ça raconte : </b>
              {result.premiere_impression.histoire}
            </div>
          )}
          {result.premiere_impression.personnalite && (
            <div style={{ marginBottom: 8 }}>
              <b>Personnalité perçue : </b>
              {result.premiere_impression.personnalite}
            </div>
          )}
          {result.premiere_impression.emotions && (
            <div>
              <b>Émotions provoquées : </b>
              {result.premiere_impression.emotions}
            </div>
          )}
        </Accordion>
      )}

      {result.attractivite_physique && (
        <Accordion title={`2 · Attractivité physique — ${result.attractivite_physique.note}/10`}>
          {Object.keys(attractLabels).map(
            (k) =>
              result.attractivite_physique[k] && (
                <div key={k} style={{ marginBottom: 6 }}>
                  <b>{attractLabels[k]} : </b>
                  {result.attractivite_physique[k]}
                </div>
              )
          )}
        </Accordion>
      )}

      {result.compatibilite && (
        <Accordion title="3 · Compatibilité avec moi">
          {Object.keys(compatLabels).map(
            (k) =>
              result.compatibilite[k] && (
                <div key={k} style={{ marginBottom: 6 }}>
                  <b>{compatLabels[k]} : </b>
                  {result.compatibilite[k]}
                </div>
              )
          )}
          {result.compatibilite.ou_ca_matche && (
            <div style={{ marginTop: 10 }}>
              <b>Où ça matcherait : </b>
              {result.compatibilite.ou_ca_matche}
            </div>
          )}
          {result.compatibilite.ou_ca_coince && (
            <div style={{ marginTop: 6 }}>
              <b>Où ça pourrait coincer : </b>
              {result.compatibilite.ou_ca_coince}
            </div>
          )}
        </Accordion>
      )}

      {result.green_flags && result.green_flags.length > 0 && (
        <Accordion title="4 · Green flags" accent="#E4EBD9">
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {result.green_flags.map((g, i) => (
              <li key={i} style={{ marginBottom: 4 }}>
                {g}
              </li>
            ))}
          </ul>
        </Accordion>
      )}

      {result.red_flags && result.red_flags.length > 0 && (
        <Accordion title="5 · Red flags" defaultOpen accent="#F1DFD9">
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {result.red_flags.map((r, i) => (
              <li key={i} style={{ marginBottom: 4 }}>
                {r}
              </li>
            ))}
          </ul>
        </Accordion>
      )}

      {result.potentiel_relationnel && (
        <Accordion title="6 · Potentiel relationnel">
          <div style={{ fontWeight: 600, marginBottom: 6 }}>
            {POTENTIEL_LABELS[result.potentiel_relationnel.type] || result.potentiel_relationnel.type}
          </div>
          <div>{result.potentiel_relationnel.explication}</div>
        </Accordion>
      )}

      {result.probabilite_match && (
        <Accordion title={`7 · Probabilité de match — ${result.probabilite_match.pourcentage}%`}>
          <div>{result.probabilite_match.explication}</div>
        </Accordion>
      )}

      {result.je_likerais && (
        <Accordion title="8 · Est-ce que je likerais ?" defaultOpen>
          <div
            style={{
              fontWeight: 700,
              marginBottom: 6,
              color:
                recommandation === "match"
                  ? COLORS.green
                  : recommandation === "pass"
                  ? COLORS.red
                  : COLORS.brass,
            }}
          >
            {result.je_likerais.reponse === "oui"
              ? "Oui"
              : result.je_likerais.reponse === "non"
              ? "Non"
              : "Oui, si une vraie accroche"}
          </div>
          <div>{result.je_likerais.pourquoi}</div>
        </Accordion>
      )}

      {result.notes_finales && (
        <Accordion title="9 · Note finale" defaultOpen>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 18, marginBottom: 10 }}>
            {[
              ["Beauté", result.notes_finales.beaute],
              ["Compatibilité", result.notes_finales.compatibilite],
              ["Potentiel relation longue", result.notes_finales.potentiel_relation_longue],
              ["Probabilité de match", result.notes_finales.probabilite_match],
            ].map(([label, val]) => (
              <div key={label} style={{ textAlign: "center" }}>
                <div style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 20, fontWeight: 600 }}>
                  {val}
                </div>
                <div style={{ fontSize: 11, color: COLORS.muted, maxWidth: 90 }}>{label}</div>
              </div>
            ))}
          </div>
          <div
            style={{
              borderTop: `1px solid ${COLORS.line}`,
              paddingTop: 8,
              fontFamily: "IBM Plex Mono, monospace",
              fontSize: 15,
              fontWeight: 600,
            }}
          >
            Note globale : {result.notes_finales.note_globale}/10
          </div>
        </Accordion>
      )}

      {result.premier_message && (
        <Accordion title="10 · Premier message" defaultOpen>
          {result.premier_message.francais && result.premier_message.francais.length > 0 && (
            <div
              style={{
                marginBottom:
                  result.premier_message.anglais && result.premier_message.anglais.length ? 14 : 0,
              }}
            >
              <div
                style={{
                  fontFamily: "Plus Jakarta Sans, sans-serif",
                  fontSize: 11.5,
                  fontWeight: 700,
                  color: COLORS.muted,
                  marginBottom: 6,
                }}
              >
                Français
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {result.premier_message.francais.map((a, i) => (
                  <OpenerLine key={i} text={a} onCopy={() => copy(a, `fr-${i}`)} copied={copiedKey === `fr-${i}`} />
                ))}
              </div>
            </div>
          )}
          {result.premier_message.anglais && result.premier_message.anglais.length > 0 && (
            <div>
              <div
                style={{
                  fontFamily: "Plus Jakarta Sans, sans-serif",
                  fontSize: 11.5,
                  fontWeight: 700,
                  color: COLORS.muted,
                  marginBottom: 6,
                }}
              >
                English
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {result.premier_message.anglais.map((a, i) => (
                  <OpenerLine key={i} text={a} onCopy={() => copy(a, `en-${i}`)} copied={copiedKey === `en-${i}`} />
                ))}
              </div>
            </div>
          )}
        </Accordion>
      )}
    </div>
  );
}

export default function HingeOptimizer() {
  const [ready, setReady] = useState(false);
  const [screen, setScreen] = useState("analyze");
  const [myProfile, setMyProfile] = useState({ bio: "", criteres: "" });
  const [bioDraft, setBioDraft] = useState("");
  const [criteriaDraft, setCriteriaDraft] = useState("");
  const [myImages, setMyImages] = useState([]);
  const [images, setImages] = useState([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState(null);
  const [debugRaw, setDebugRaw] = useState(null);
  const candidateFileInputRef = useRef(null);
  const myFileInputRef = useRef(null);

  useEffect(() => {
    (async () => {
      let bio = "";
      let criteres = "";
      try {
        const r = await window.storage.get("my-profile", false);
        if (r && r.value) {
          try {
            const parsed = JSON.parse(r.value);
            if (parsed && typeof parsed === "object") {
              bio = parsed.bio || "";
              criteres = parsed.criteres || "";
            } else {
              bio = String(r.value);
            }
          } catch (e) {
            // ancien format : simple chaîne de texte
            bio = r.value;
          }
        }
      } catch (e) {
        /* no profile saved yet */
      }
      let mImgs = [];
      try {
        const r = await window.storage.get("my-profile-images", false);
        if (r && r.value) mImgs = JSON.parse(r.value);
      } catch (e) {
        /* no photos saved yet */
      }
      let h = [];
      try {
        const r = await window.storage.get("history", false);
        if (r && r.value) h = JSON.parse(r.value);
      } catch (e) {
        /* no history yet */
      }
      setMyProfile({ bio, criteres });
      setBioDraft(bio);
      setCriteriaDraft(criteres);
      setMyImages(Array.isArray(mImgs) ? mImgs : []);
      setHistory(Array.isArray(h) ? h : []);
      setScreen(bio ? "analyze" : "profile");
      setReady(true);
    })();
  }, []);

  async function saveProfile() {
    try {
      const payload = { bio: bioDraft, criteres: criteriaDraft };
      await window.storage.set("my-profile", JSON.stringify(payload), false);
      setMyProfile(payload);
      setScreen("analyze");
      setError(null);
    } catch (e) {
      setError("Impossible d'enregistrer ton profil pour le moment.");
    }
  }

  async function persistHistory(next) {
    setHistory(next);
    try {
      await window.storage.set("history", JSON.stringify(next.slice(0, 40)), false);
    } catch (e) {
      /* non-fatal */
    }
  }

  async function handleCandidateFiles(fileList) {
    const files = Array.from(fileList).slice(0, MAX_IMAGES - images.length);
    if (files.length === 0) return;
    try {
      const processed = await Promise.all(files.map(resizeImageFile));
      setImages((prev) =>
        [...prev, ...processed.map((p, i) => ({ id: `${Date.now()}-${i}`, ...p }))].slice(
          0,
          MAX_IMAGES
        )
      );
      setError(null);
    } catch (e) {
      setError("Une des images n'a pas pu être lue. Réessaie avec une capture standard (PNG/JPG).");
    }
  }

  function removeImage(id) {
    setImages((prev) => prev.filter((im) => im.id !== id));
  }

  async function handleMyFiles(fileList) {
    const files = Array.from(fileList).slice(0, MAX_MY_IMAGES - myImages.length);
    if (files.length === 0) return;
    try {
      const processed = await Promise.all(files.map(resizeImageFile));
      const next = [
        ...myImages,
        ...processed.map((p, i) => ({
          id: `${Date.now()}-${i}`,
          base64: p.base64,
          mediaType: p.mediaType,
        })),
      ].slice(0, MAX_MY_IMAGES);
      setMyImages(next);
      setError(null);
      try {
        await window.storage.set("my-profile-images", JSON.stringify(next), false);
      } catch (e) {
        /* non-fatal */
      }
    } catch (e) {
      setError("Une des images n'a pas pu être lue. Réessaie avec une capture standard (PNG/JPG).");
    }
  }

  async function removeMyImage(id) {
    const next = myImages.filter((im) => im.id !== id);
    setMyImages(next);
    try {
      await window.storage.set("my-profile-images", JSON.stringify(next), false);
    } catch (e) {
      /* non-fatal */
    }
  }

  useEffect(() => {
    function onPaste(e) {
      if (!e.clipboardData) return;
      const items = Array.from(e.clipboardData.items || []).filter(
        (it) => it.type && it.type.startsWith("image/")
      );
      if (items.length === 0) return;
      const files = items.map((it) => it.getAsFile()).filter(Boolean);
      if (files.length === 0) return;
      e.preventDefault();
      if (screen === "profile") handleMyFiles(files);
      else if (screen === "analyze") handleCandidateFiles(files);
    }
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, [screen, images, myImages]);

  async function analyze() {
    if (!myProfile || !myProfile.bio) {
      setScreen("profile");
      return;
    }
    if (images.length === 0) {
      setError("Ajoute au moins une capture d'écran du profil à analyser.");
      return;
    }
    setAnalyzing(true);
    setError(null);
    setResult(null);
    setDebugRaw(null);

    const introText = `Tu aides à évaluer la compatibilité entre deux profils de l'app de rencontre Hinge, à partir de captures d'écran.

MON PROFIL (décrit par moi) :
"""
${myProfile.bio}
"""

MES CRITÈRES DE MATCHING (ce que je recherche, mes priorités, mes éventuels dealbreakers) :
"""
${myProfile.criteres && myProfile.criteres.trim() ? myProfile.criteres : "Non précisé."}
"""`;

    const instructionsText = `Utilise le cadre d'analyse suivant. Règles impératives, à respecter dans chaque champ :
- Sois honnête, ne cherche jamais à me faire plaisir.
- Si le profil est moyen, dis-le clairement. Si elle est magnifique mais peu compatible, dis-le. Si elle est moins spectaculaire mais excellente pour moi, dis-le aussi.
- Évalue le potentiel réel, pas le fantasme.
- Ne minimise jamais les red flags, même subtils.
- Si certains éléments sont invisibles faute de captures (peu de photos, pas de prompts, bio vide...), précise ce qui manque dans "elements_manquants" plutôt que de l'inventer.
- Tiens compte de mon profil (bio, critères, éventuelles photos) pour estimer la compatibilité et la probabilité de match.
- IMPORTANT — sois TRÈS bref dans chaque champ texte : une phrase courte (10-15 mots), jamais un paragraphe. La rapidité de génération dépend directement de la brièveté. Un rapport court et précis vaut mieux qu'un rapport long.

Réponds UNIQUEMENT avec un objet JSON valide, sans texte avant ni après, sans balises markdown, avec exactement cette structure :
{
  "prenom": "prénom déduit, ou 'Profil' si inconnu",
  "premiere_impression": {
    "histoire": "ce que ce profil raconte en 2-3 phrases",
    "personnalite": "la personnalité qui s'en dégage",
    "emotions": "les émotions que ça provoque à la première lecture, en 30 secondes"
  },
  "attractivite_physique": {
    "note": nombre entre 0 et 10 avec une décimale — une note réaliste "vraie vie", pas une note Instagram,
    "visage": "...", "sourire": "...", "regard": "...", "style": "...", "naturel": "...", "elegance": "...", "sex_appeal": "..."
  },
  "compatibilite": {
    "humour": "...", "curiosite": "...", "intelligence": "...", "stabilite_emotionnelle": "...", "valeurs": "...", "style_de_vie": "...", "rythme_de_vie": "...", "communication": "...", "envie_de_construire": "...",
    "ou_ca_matche": "où ça matcherait entre nous, concrètement",
    "ou_ca_coince": "où ça pourrait coincer, concrètement"
  },
  "green_flags": ["signe positif, en 5-8 mots — maximum 4 éléments"],
  "red_flags": ["signe même subtil, en 5-8 mots — maximum 4 éléments, tableau vide si vraiment aucun"],
  "potentiel_relationnel": {
    "type": "partenaire_potentielle" ou "aventure" ou "probablement_indisponible" ou "juste_des_matchs" ou "tres_compatible",
    "explication": "pourquoi ce type de potentiel"
  },
  "probabilite_match": {
    "pourcentage": nombre entier entre 0 et 100,
    "explication": "en tenant compte de la concurrence probable qu'elle reçoit, de la qualité de mon profil, de notre compatibilité, et du type de profils qu'elle reçoit probablement"
  },
  "je_likerais": {
    "reponse": "oui" ou "non" ou "oui_si_accroche",
    "pourquoi": "explication franche de la décision"
  },
  "notes_finales": {
    "beaute": nombre /10,
    "compatibilite": nombre /10,
    "potentiel_relation_longue": nombre /10,
    "probabilite_match": nombre /10,
    "note_globale": nombre /10, moyenne pondérée réfléchie des quatre notes ci-dessus
  },
  "elements_manquants": "ce qui manque pour juger pleinement (chaîne vide si rien ne manque)",
  "premier_message": {
    "francais": ["3 accroches courtes en français"],
    "anglais": ["3 accroches courtes en anglais — UNIQUEMENT si le profil semble anglophone, sinon tableau vide"]
  }
}

Grille de décision pour "je_likerais.reponse" (à appliquer strictement à partir de "notes_finales.note_globale") :
- note globale < 7,5/10 → "non"
- 7,5 à 7,9/10 → "oui_si_accroche" (seulement s'il existe une vraie accroche possible, sinon "non")
- 8/10 et plus → "oui"
L'objectif n'est pas de maximiser les matchs mais de maximiser les rencontres de qualité — mieux vaut moins de likes mais de meilleure qualité.

Pour "premier_message" : style cocky & funny, intelligent, léger, joueur, taquin, jamais needy, jamais de compliment physique direct, jamais de question générique. Toujours rebondir sur un détail précis et concret du profil (une photo, un prompt, un détail exact).`;

    const content = [{ type: "text", text: introText }];

    if (myImages.length > 0) {
      content.push({
        type: "text",
        text: "Voici quelques photos de mon propre profil, uniquement pour comprendre mon univers et mon style (ne pas les évaluer) :",
      });
      myImages.forEach((im) =>
        content.push({
          type: "image",
          source: { type: "base64", media_type: im.mediaType, data: im.base64 },
        })
      );
    }

    content.push({
      type: "text",
      text: "Voici les captures d'écran du profil de la personne à évaluer (photos, bio, réponses aux prompts) :",
    });
    images.forEach((im) =>
      content.push({
        type: "image",
        source: { type: "base64", media_type: im.mediaType, data: im.base64 },
      })
    );

    content.push({ type: "text", text: instructionsText });

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 3500,
          messages: [{ role: "user", content }],
        }),
      });
      const data = await response.json();

      if (data.error) {
        setError(`Erreur API : ${data.error.message || "requête refusée"}.`);
        setDebugRaw(JSON.stringify(data, null, 2));
        setAnalyzing(false);
        return;
      }

      const rawText = (data.content || [])
        .map((b) => (b.type === "text" ? b.text : ""))
        .join("\n")
        .trim();

      const jsonSlice = extractJsonObject(rawText);

      if (!jsonSlice) {
        const truncated = data.stop_reason === "max_tokens";
        setError(
          truncated
            ? "La réponse a été coupée avant la fin (limite de longueur atteinte). Réessaie — la limite a été augmentée."
            : "La réponse n'a pas pu être lue comme du JSON. Réessaie, en réduisant si possible le nombre de captures."
        );
        setDebugRaw(rawText || "(réponse vide)");
        setAnalyzing(false);
        return;
      }

      const parsed = JSON.parse(jsonSlice);

      setResult(parsed);
      setDebugRaw(null);
      const entry = { id: Date.now(), ts: new Date().toISOString(), ...parsed };
      await persistHistory([entry, ...history]);
      setImages([]);
    } catch (e) {
      setError(
        `L'analyse a échoué (${e && e.message ? e.message : "réponse illisible ou erreur réseau"}). Tu peux réessayer.`
      );
    } finally {
      setAnalyzing(false);
    }
  }

  async function deleteHistoryEntry(id) {
    const next = history.filter((h) => h.id !== id);
    await persistHistory(next);
  }

  if (!ready) {
    return (
      <div style={{ padding: 40, fontFamily: "IBM Plex Mono, monospace", color: COLORS.muted }}>
        <style>{FONTS}</style>
        chargement du dossier…
      </div>
    );
  }

  return (
    <div
      className="hinge-scout-root"
      style={{
        width: "100%",
        maxWidth: 480,
        margin: "0 auto",
        minHeight: 560,
        background: COLORS.paper,
        color: COLORS.ink,
        fontFamily: "Plus Jakarta Sans, sans-serif",
        padding: "0",
        borderRadius: 22,
        overflow: "hidden",
        WebkitTapHighlightColor: "transparent",
        boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
      }}
    >
      <style>{FONTS}</style>
      <div
        style={{
          background: COLORS.ink,
          color: COLORS.paper,
          padding: "22px 20px 18px",
        }}
      >
        <div
          style={{
            fontFamily: "Newsreader, serif",
            fontStyle: "italic",
            fontWeight: 500,
            fontSize: 28,
            letterSpacing: "-0.01em",
          }}
        >
          Hinge Optimizer
        </div>
        <div
          style={{
            fontFamily: "Plus Jakarta Sans, sans-serif",
            fontSize: 12.5,
            color: "#B9B6AE",
            marginTop: 3,
          }}
        >
          Repérage avant le like · outil personnel, non affilié à Hinge
        </div>
      </div>

      <div style={{ background: COLORS.paper, minHeight: 480 }}>
        <div
          style={{
            display: "flex",
            borderBottom: `1px solid ${COLORS.line}`,
            background: COLORS.paper,
          }}
        >
          <Tab active={screen === "analyze"} onClick={() => setScreen("analyze")}>
            Analyser
          </Tab>
          <Tab active={screen === "profile"} onClick={() => setScreen("profile")}>
            Mon profil
          </Tab>
          <Tab active={screen === "history"} onClick={() => setScreen("history")}>
            Archives {history.length > 0 ? `(${history.length})` : ""}
          </Tab>
        </div>

        <div style={{ padding: "18px 16px" }}>
          {screen === "profile" && (
            <div>
              <div style={{ fontFamily: "Newsreader, serif", fontSize: 18, marginBottom: 6 }}>
                Ton univers
              </div>
              <div style={{ fontSize: 13, color: COLORS.muted, marginBottom: 10, lineHeight: 1.5 }}>
                Décris-toi comme sur Hinge : âge, ce que tu fais, tes centres d'intérêt, ton ton
                (sérieux, léger, direct...). Plus c'est précis, plus les scores et les accroches
                seront pertinents.
              </div>
              <textarea
                value={bioDraft}
                onChange={(e) => setBioDraft(e.target.value)}
                placeholder="Ex : 29 ans, ingénieur, je grimpe le week-end et je cuisine trop de pâtes. Humour pince-sans-rire, plutôt direct..."
                style={{
                  width: "100%",
                  minHeight: 130,
                  padding: 12,
                  fontFamily: "Plus Jakarta Sans, sans-serif",
                  fontSize: 14,
                  border: `1px solid ${COLORS.line}`,
                  borderRadius: 12,
                  background: COLORS.cream,
                  color: COLORS.ink,
                  resize: "vertical",
                  boxSizing: "border-box",
                  marginBottom: 18,
                }}
              />

              <div style={{ fontFamily: "Newsreader, serif", fontSize: 18, marginBottom: 6 }}>
                Tes critères de matching
              </div>
              <div style={{ fontSize: 13, color: COLORS.muted, marginBottom: 10, lineHeight: 1.5 }}>
                Ce que tu recherches, tes priorités, tes éventuels dealbreakers (distance, enfants,
                tabac, religion, type de relation...).
              </div>
              <textarea
                value={criteriaDraft}
                onChange={(e) => setCriteriaDraft(e.target.value)}
                placeholder="Ex : je cherche une relation sérieuse, pas avant 6 mois d'enfants dans l'idéal, non-fumeuse, dans un rayon de 15 km, ouverture d'esprit et curiosité intellectuelle sont essentielles..."
                style={{
                  width: "100%",
                  minHeight: 100,
                  padding: 12,
                  fontFamily: "Plus Jakarta Sans, sans-serif",
                  fontSize: 14,
                  border: `1px solid ${COLORS.line}`,
                  borderRadius: 12,
                  background: COLORS.cream,
                  color: COLORS.ink,
                  resize: "vertical",
                  boxSizing: "border-box",
                  marginBottom: 18,
                }}
              />

              <div style={{ fontFamily: "Newsreader, serif", fontSize: 18, marginBottom: 6 }}>
                Tes photos de profil
              </div>
              <div style={{ fontSize: 13, color: COLORS.muted, marginBottom: 10, lineHeight: 1.5 }}>
                Facultatif, mais ça aide à saisir ton style et ton univers visuel. Restent
                enregistrées entre tes sessions.
              </div>
              <Dropzone
                onFiles={handleMyFiles}
                inputRef={myFileInputRef}
                label="Choisis des photos dans ta galerie"
                hint="Astuce : colle directement une capture avec Ctrl/Cmd+V"
              />
              <ImageThumbs images={myImages} onRemove={removeMyImage} />

              <button
                onClick={saveProfile}
                disabled={!bioDraft.trim()}
                style={{
                  marginTop: 6,
                  width: "100%",
                  fontFamily: "Plus Jakarta Sans, sans-serif",
                  fontWeight: 700,
                  fontSize: 15,
                  padding: "15px 18px",
                  background: bioDraft.trim() ? COLORS.ink : COLORS.line,
                  color: COLORS.paper,
                  border: "none",
                  borderRadius: 999,
                  cursor: bioDraft.trim() ? "pointer" : "not-allowed",
                }}
              >
                Enregistrer
              </button>
            </div>
          )}

          {screen === "analyze" && (
            <div>
              {!myProfile || !myProfile.bio ? (
                <div style={{ fontSize: 14, color: COLORS.muted }}>
                  Renseigne d'abord ton profil dans l'onglet « Mon profil ».
                </div>
              ) : (
                <>
                  <div style={{ fontFamily: "Newsreader, serif", fontSize: 18, marginBottom: 6 }}>
                    Nouveau profil à analyser
                  </div>
                  <div style={{ fontSize: 13, color: COLORS.muted, marginBottom: 14, lineHeight: 1.5 }}>
                    Dépose 1 à {MAX_IMAGES} captures d'écran classiques du profil Hinge (photos,
                    bio, prompts). Évite les captures "page entière" très longues : une image trop
                    étirée est compressée par le modèle et devient difficile à lire — mieux vaut
                    3 à 5 captures normales.
                  </div>

                  <Dropzone
                    onFiles={handleCandidateFiles}
                    inputRef={candidateFileInputRef}
                    label="Choisis les captures dans ta galerie"
                    hint="Astuce : colle directement une capture avec Ctrl/Cmd+V"
                  />
                  <ImageThumbs images={images} onRemove={removeImage} />

                  <button
                    onClick={analyze}
                    disabled={analyzing || images.length === 0}
                    style={{
                      width: "100%",
                      fontFamily: "Plus Jakarta Sans, sans-serif",
                      fontWeight: 700,
                      fontSize: 15,
                      padding: "15px 18px",
                      background: images.length && !analyzing ? COLORS.ink : COLORS.line,
                      color: COLORS.paper,
                      border: "none",
                      borderRadius: 999,
                      cursor: images.length && !analyzing ? "pointer" : "not-allowed",
                    }}
                  >
                    {analyzing ? "Analyse en cours…" : "Analyser ce profil"}
                  </button>

                  {error && (
                    <div style={{ marginTop: 12, color: COLORS.red, fontSize: 13 }}>{error}</div>
                  )}

                  {debugRaw && (
                    <Accordion title="Détails techniques (debug)" accent="#F1DFD9">
                      <div
                        style={{
                          fontFamily: "IBM Plex Mono, monospace",
                          fontSize: 11,
                          whiteSpace: "pre-wrap",
                          wordBreak: "break-word",
                          maxHeight: 240,
                          overflowY: "auto",
                        }}
                      >
                        {debugRaw}
                      </div>
                    </Accordion>
                  )}

                  {result && <ResultReport result={result} />}
                </>
              )}
            </div>
          )}

          {screen === "history" && (
            <div>
              <div style={{ fontFamily: "Newsreader, serif", fontSize: 18, marginBottom: 12 }}>
                Archives
              </div>
              {history.length === 0 ? (
                <div style={{ fontSize: 13, color: COLORS.muted }}>Aucune analyse pour l'instant.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {history.map((h) => {
                    const noteGlobale = h.notes_finales
                      ? h.notes_finales.note_globale
                      : h.score != null
                      ? (h.score / 10).toFixed(1)
                      : "–";
                    const recommandation = REPONSE_MAP[h?.je_likerais?.reponse] || h.recommandation || "mitige";
                    return (
                      <div
                        key={h.id}
                        onClick={() => {
                          setResult(h);
                          setScreen("analyze");
                        }}
                        style={{
                          border: `1px solid ${COLORS.line}`,
                          borderRadius: 10,
                          padding: "10px 12px",
                          background: COLORS.cream,
                          display: "flex",
                          flexWrap: "wrap",
                          alignItems: "center",
                          gap: 10,
                          cursor: "pointer",
                        }}
                      >
                        <div style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 18, width: 36, textAlign: "center", flexShrink: 0 }}>
                          {noteGlobale}
                        </div>
                        <div style={{ flex: 1, minWidth: 90 }}>
                          <div style={{ fontFamily: "Newsreader, serif", fontSize: 15, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{h.prenom}</div>
                          <div style={{ fontSize: 12, color: COLORS.muted }}>
                            {new Date(h.ts).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}
                          </div>
                        </div>
                        <div style={{ flexShrink: 0 }}>
                          <Stamp recommandation={recommandation} />
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteHistoryEntry(h.id);
                          }}
                          style={{
                            flexShrink: 0,
                            width: 28,
                            height: 28,
                            border: "none",
                            background: "transparent",
                            color: COLORS.red,
                            cursor: "pointer",
                            fontSize: 18,
                          }}
                          title="Supprimer"
                        >
                          ×
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
