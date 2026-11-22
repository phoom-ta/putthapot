(function () {
  const state = {
    topicId: PUTTHAPOT_TOPICS[0].id,
    selectedNodeId: null,
    evidenceFilter: "all", // "all" | "A" | "editorial"
    cycleDirection: "samudaya", // "samudaya" | "nirodha"
    showPali: true,
    searchQuery: "",
    fontScale: 1,
    theme: "parchment"
  };

  // DOM Elements
  const topicTabsEl = document.getElementById("topicTabs");
  const filterPills = document.querySelectorAll(".filter-pill");
  const filterStatusText = document.getElementById("filterStatusText");
  const diagramTitleEl = document.getElementById("diagramTitle");
  const diagramSubtitleEl = document.getElementById("diagramSubtitle");
  const cycleDirectionGroup = document.getElementById("cycleDirectionGroup");
  const circuitSvg = document.getElementById("circuitSvg");
  const inspectorNodeTag = document.getElementById("inspectorNodeTag");
  const inspectorTitle = document.getElementById("inspectorTitle");
  const inspectorSummary = document.getElementById("inspectorSummary");
  const resetNodeBtn = document.getElementById("resetNodeBtn");
  const contentKicker = document.getElementById("contentKicker");
  const contentHeading = document.getElementById("contentHeading");
  const contentStats = document.getElementById("contentStats");
  const cardsContainer = document.getElementById("cardsContainer");
  const searchInput = document.getElementById("searchInput");
  const clearSearchBtn = document.getElementById("clearSearchBtn");
  const togglePaliBtn = document.getElementById("togglePaliBtn");
  const fontDecreaseBtn = document.getElementById("fontDecreaseBtn");
  const fontIncreaseBtn = document.getElementById("fontIncreaseBtn");
  const themeToggleBtn = document.getElementById("themeToggleBtn");

  function getCurrentTopic() {
    return PUTTHAPOT_TOPICS.find((t) => t.id === state.topicId) || PUTTHAPOT_TOPICS[0];
  }

  function renderTopicTabs() {
    topicTabsEl.innerHTML = "";
    PUTTHAPOT_TOPICS.forEach((topic) => {
      const btn = document.createElement("button");
      btn.className = "topic-tab" + (topic.id === state.topicId ? " active" : "");
      btn.innerHTML = `<span class="tab-num">${topic.number}</span> ${topic.title}`;
      btn.addEventListener("click", () => {
        state.topicId = topic.id;
        state.selectedNodeId = null;
        renderAll();
      });
      topicTabsEl.appendChild(btn);
    });
  }

  function updateFilterBarUI() {
    filterPills.forEach((pill) => {
      pill.classList.toggle("active", pill.dataset.filter === state.evidenceFilter);
    });

    if (state.evidenceFilter === "all") {
      filterStatusText.innerHTML =
        'กำลังแสดง: <strong>ทั้งหมด</strong> (พระดำรัสชั้น A + ส่วนห้องเรียบเรียงเชื่อมโยง)';
    } else if (state.evidenceFilter === "A") {
      filterStatusText.innerHTML =
        'กำลังแสดง: <strong style="color:var(--tier-a-accent)">เฉพาะ A พระดำรัส</strong> (พุทธพจน์ล้วนจากพระไตรปิฎก)';
    } else {
      filterStatusText.innerHTML =
        'กำลังแสดง: <strong style="color:var(--tier-ed-accent)">เฉพาะห้องเรียบเรียง</strong> (คำอธิบายเชื่อมโยงและสังเคราะห์)';
    }
  }

  function renderCircuitDiagram() {
    const topic = getCurrentTopic();
    diagramTitleEl.textContent = topic.diagramTitle;
    diagramSubtitleEl.textContent = topic.diagramSubtitle;

    if (topic.hasDirectionSwitch) {
      cycleDirectionGroup.classList.remove("hidden");
      cycleDirectionGroup.querySelectorAll(".mode-btn").forEach((btn) => {
        btn.classList.toggle("active", btn.dataset.direction === state.cycleDirection);
      });
    } else {
      cycleDirectionGroup.classList.add("hidden");
    }

    const cx = 260;
    const cy = 260;
    const radius = topic.nodes.length > 6 ? 192 : 162;
    const nodeR = topic.nodes.length > 6 ? 31 : 40;
    const total = topic.nodes.length;

    const coords = topic.nodes.map((node, i) => {
      const angle = (i / total) * Math.PI * 2 - Math.PI / 2;
      return {
        ...node,
        index: i,
        x: cx + radius * Math.cos(angle),
        y: cy + radius * Math.sin(angle)
      };
    });

    const isDark = state.theme === "dark";
    const ringStroke = isDark ? "#353b48" : "#dfd5c3";
    const edgeColor =
      state.cycleDirection === "nirodha" && topic.hasDirectionSwitch
        ? "#3b82f6"
        : isDark
        ? "#d9a036"
        : "#c98618";

    let svgContent = `
      <defs>
        <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
          <polygon points="0 0, 8 3, 0 6" fill="${edgeColor}" opacity="0.85" />
        </marker>
      </defs>
      <!-- Outer Subtle Guide Circle -->
      <circle cx="${cx}" cy="${cy}" r="${radius}" fill="none" stroke="${ringStroke}" stroke-width="2" stroke-dasharray="5 5" />
    `;

    // Draw directional edges between nodes
    for (let i = 0; i < total; i++) {
      const fromIdx =
        state.cycleDirection === "nirodha" && topic.hasDirectionSwitch
          ? (i + 1) % total
          : i;
      const toIdx =
        state.cycleDirection === "nirodha" && topic.hasDirectionSwitch
          ? i
          : (i + 1) % total;

      const a = coords[fromIdx];
      const b = coords[toIdx];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.hypot(dx, dy);
      const ux = dx / dist;
      const uy = dy / dist;

      const x1 = a.x + ux * (nodeR + 4);
      const y1 = a.y + uy * (nodeR + 4);
      const x2 = b.x - ux * (nodeR + 7);
      const y2 = b.y - uy * (nodeR + 7);

      const isHighlightedEdge =
        state.selectedNodeId === a.id || state.selectedNodeId === b.id;

      svgContent += `
        <line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}"
              x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}"
              stroke="${edgeColor}"
              stroke-width="${isHighlightedEdge ? 3 : 1.7}"
              stroke-opacity="${isHighlightedEdge ? 1 : 0.55}"
              marker-end="url(#arrowhead)" />
      `;
    }

    // Center Hub
    const centerText = (
      topic.centerLabel[state.cycleDirection] || topic.title
    ).split("\n");

    svgContent += `
      <circle cx="${cx}" cy="${cy}" r="66"
              fill="${isDark ? "#24272e" : "#ffffff"}"
              stroke="${edgeColor}" stroke-width="2" />
      <text x="${cx}" y="${cy - 6}" text-anchor="middle"
            fill="${isDark ? "#ece9e2" : "#1f1d1a"}"
            font-family="Noto Serif Thai, serif" font-size="13.5" font-weight="700">
        ${centerText[0] || ""}
      </text>
      <text x="${cx}" y="${cy + 15}" text-anchor="middle"
            fill="${isDark ? "#b5afa4" : "#57524a"}"
            font-family="Sarabun, sans-serif" font-size="11.5" font-weight="600">
        ${centerText[1] || ""}
      </text>
    `;

    // Draw Nodes
    coords.forEach((node) => {
      const isSelected = state.selectedNodeId === node.id;
      const hasMatchingEntries = topic.entries.some(
        (e) =>
          e.nodeId === node.id &&
          (state.evidenceFilter === "all" || e.tier === state.evidenceFilter)
      );

      let fill = isDark ? "#1d1f24" : "#ffffff";
      let stroke = isDark ? "#464d5c" : "#cbbda6";
      let textColor = isDark ? "#ece9e2" : "#1f1d1a";

      if (isSelected) {
        fill = edgeColor;
        stroke = "#ffffff";
        textColor = "#ffffff";
      } else if (hasMatchingEntries) {
        stroke =
          state.evidenceFilter === "editorial"
            ? "#4a6fa5"
            : isDark
            ? "#d9a036"
            : "#c98618";
      }

      const labelParts = node.short.split(". ");
      const numPart = labelParts[0] ? labelParts[0] + "." : "";
      const namePart = labelParts[1] || node.short;

      svgContent += `
        <g class="svg-node" data-node-id="${node.id}" tabindex="0" role="button" aria-label="${node.title}">
          <circle cx="${node.x.toFixed(1)}" cy="${node.y.toFixed(1)}" r="${nodeR}"
                  fill="${fill}" stroke="${stroke}" stroke-width="${isSelected ? 3 : 2}" />
          <text x="${node.x.toFixed(1)}" y="${(node.y - 5).toFixed(1)}" text-anchor="middle"
                fill="${textColor}" font-size="10.5" font-weight="700" opacity="0.88">
            ${numPart}
          </text>
          <text x="${node.x.toFixed(1)}" y="${(node.y + 10).toFixed(1)}" text-anchor="middle"
                fill="${textColor}" font-size="${total > 6 ? 10.5 : 11.5}" font-weight="700">
            ${namePart}
          </text>
        </g>
      `;
    });

    circuitSvg.innerHTML = svgContent;

    circuitSvg.querySelectorAll(".svg-node").forEach((el) => {
      el.addEventListener("click", () => {
        const clickedId = el.dataset.nodeId;
        state.selectedNodeId = state.selectedNodeId === clickedId ? null : clickedId;
        renderAll();
      });
    });

    // Update Inspector Box
    if (state.selectedNodeId) {
      const activeNode = topic.nodes.find((n) => n.id === state.selectedNodeId);
      inspectorNodeTag.textContent = "โหนดที่กำลังโฟกัส";
      inspectorTitle.textContent = activeNode ? activeNode.title : "—";
      inspectorSummary.textContent = activeNode ? activeNode.summary : "";
      resetNodeBtn.classList.remove("hidden");
    } else {
      inspectorNodeTag.textContent = "ภาพรวมวงจร";
      inspectorTitle.textContent = topic.fullTitle;
      inspectorSummary.textContent =
        "กำลังแสดงเนื้อหาจากทุกโหนดในวงจรนี้ (คลิกที่วงกลมโหนดด้านบนเพื่อกรองเฉพาะจุด)";
      resetNodeBtn.classList.add("hidden");
    }
  }

  function renderCards() {
    const topic = getCurrentTopic();
    contentKicker.textContent = topic.kicker;
    contentHeading.textContent = topic.fullTitle;

    const query = state.searchQuery.trim().toLowerCase();

    const filtered = topic.entries.filter((entry) => {
      if (state.evidenceFilter !== "all" && entry.tier !== state.evidenceFilter) {
        return false;
      }
      if (state.selectedNodeId && entry.nodeId !== state.selectedNodeId) {
        return false;
      }
      if (query) {
        const haystack = [entry.title, entry.ref, entry.pali || "", entry.body]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });

    contentStats.textContent = `แสดง ${filtered.length} จาก ${topic.entries.length} รายการ`;
    cardsContainer.innerHTML = "";

    if (filtered.length === 0) {
      cardsContainer.innerHTML = `
        <div class="empty-state">
          <h3>ไม่พบรายการที่ตรงกับตัวกรองปัจจุบัน</h3>
          <p>ลองกดปุ่ม <strong>"ทั้งหมด"</strong> ในแถบระดับหลักฐาน หรือกด <strong>"ดูทุกโหนดในหัวข้อนี้"</strong> เพื่อแสดงเนื้อหาทั้งหมด</p>
        </div>
      `;
      return;
    }

    filtered.forEach((entry) => {
      const nodeObj = topic.nodes.find((n) => n.id === entry.nodeId);
      const isTierA = entry.tier === "A";

      const card = document.createElement("article");
      card.className = `evidence-card ${isTierA ? "tier-A" : "tier-editorial"}`;

      const badgeHtml = isTierA
        ? `<span class="tier-badge tier-a">A พระดำรัส</span>`
        : `<span class="tier-badge tier-ed">ห้อง เรียบเรียง</span>`;

      const paliHtml =
        isTierA && entry.pali && state.showPali
          ? `<div class="pali-quote">${entry.pali}</div>`
          : "";

      card.innerHTML = `
        <div class="card-meta">
          <div class="card-badges">
            ${badgeHtml}
            ${
              nodeObj
                ? `<button class="node-chip" data-node="${nodeObj.id}" title="คลิกเพื่อโฟกัสโหนดนี้">โหนด: ${nodeObj.short}</button>`
                : ""
            }
          </div>
          <span class="sutta-ref">${entry.ref}</span>
        </div>
        <h3 class="card-title">${entry.title}</h3>
        ${paliHtml}
        <div class="card-body">${entry.body}</div>
        <div class="card-footer-note">
          <span>${entry.note}</span>
        </div>
      `;

      const chipBtn = card.querySelector(".node-chip");
      if (chipBtn) {
        chipBtn.addEventListener("click", () => {
          state.selectedNodeId = chipBtn.dataset.node;
          renderAll();
        });
      }

      cardsContainer.appendChild(card);
    });
  }

  function renderAll() {
    renderTopicTabs();
    updateFilterBarUI();
    renderCircuitDiagram();
    renderCards();
  }

  // Event Listeners
  filterPills.forEach((pill) => {
    pill.addEventListener("click", () => {
      state.evidenceFilter = pill.dataset.filter;
      renderAll();
    });
  });

  cycleDirectionGroup.querySelectorAll(".mode-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.cycleDirection = btn.dataset.direction;
      renderAll();
    });
  });

  resetNodeBtn.addEventListener("click", () => {
    state.selectedNodeId = null;
    renderAll();
  });

  searchInput.addEventListener("input", (e) => {
    state.searchQuery = e.target.value;
    clearSearchBtn.classList.toggle("hidden", !state.searchQuery);
    renderCards();
  });

  clearSearchBtn.addEventListener("click", () => {
    state.searchQuery = "";
    searchInput.value = "";
    clearSearchBtn.classList.add("hidden");
    renderCards();
  });

  togglePaliBtn.addEventListener("click", () => {
    state.showPali = !state.showPali;
    togglePaliBtn.classList.toggle("active", state.showPali);
    togglePaliBtn.textContent = state.showPali ? "บาลี: เปิด" : "บาลี: ปิด";
    renderCards();
  });

  fontIncreaseBtn.addEventListener("click", () => {
    state.fontScale = Math.min(1.25, +(state.fontScale + 0.05).toFixed(2));
    document.documentElement.style.setProperty("--font-scale", state.fontScale);
  });

  fontDecreaseBtn.addEventListener("click", () => {
    state.fontScale = Math.max(0.85, +(state.fontScale - 0.05).toFixed(2));
    document.documentElement.style.setProperty("--font-scale", state.fontScale);
  });

  themeToggleBtn.addEventListener("click", () => {
    state.theme = state.theme === "parchment" ? "dark" : "parchment";
    document.documentElement.setAttribute("data-theme", state.theme);
    renderCircuitDiagram();
  });

  // Initial Render
  renderAll();
})();
