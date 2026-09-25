const sessao = EDU_AUTH.exigir("professor");
let graficoTurma, graficoComparacao;
const statusLabel = { ok: "Em dia", atencao: "Atenção", critico: "Crítico" };

if (sessao) {
  const professor = EDU.buscarProfessor(sessao.id);

  if (!professor) {
    console.error("[EduMetrics] Professor não encontrado no cache:", sessao.id);
    document.body.innerHTML = `
      <div class="login-wrap">
        <div class="login-card">
          <div class="brand">Edu<span>Metrics</span></div>
          <p class="login-tag">Não encontramos sua conta.</p>
          <p class="panel-sub">
            A sessão aponta para o professor <code>${sessao.id}</code>, mas ele não
            foi carregado do banco. Verifique o <strong>seed.sql</strong> e as policies.
          </p>
          <button class="enter-btn" onclick="EDU_AUTH.sair()">Voltar ao login</button>
        </div>
      </div>`;
  } else {
    iniciarProfessor(professor);
  }
}

function iniciarProfessor(professor) {
  document.getElementById("who-name").textContent = professor.nome;
  document.getElementById("who-disc").textContent = professor.disciplina;

  const filtroTurma = document.getElementById("filtro-turma");
  const optTodas = document.createElement("option");
  optTodas.value = "";
  optTodas.textContent = "Todas as turmas do professor";
  filtroTurma.appendChild(optTodas);
  professor.turmas.forEach(t => {
    const opt = document.createElement("option");
    opt.value = t;
    opt.textContent = t;
    filtroTurma.appendChild(opt);
  });

  function turmaAtual() {
    return filtroTurma.value;
  }

  function alunosNoEscopo() {
    if (turmaAtual()) return EDU.listarAlunos(turmaAtual());
    return professor.turmas.flatMap(t => EDU.listarAlunos(t));
  }

  function renderIndicadores() {
    const alunos = alunosNoEscopo();
    if (!alunos.length) {
      document.getElementById("indicadores").innerHTML =
        `<div class="indicator"><div class="label">Sem dados</div><div class="value num-display">—</div><div class="sub">nenhum aluno no filtro</div></div>`;
      return;
    }
    const media = +(alunos.reduce((s, a) => s + a.mediaGeral, 0) / alunos.length).toFixed(1);
    const frequencia = Math.round(alunos.reduce((s, a) => s + a.frequencia, 0) / alunos.length);
    const emDificuldade = alunos.filter(a => a.status !== "ok").length;
    const tendencia = +(alunos.reduce((s, a) => s + a.tendencia, 0) / alunos.length).toFixed(1);

    document.getElementById("indicadores").innerHTML = `
      <div class="indicator">
        <div class="label">Média da turma</div>
        <div class="value num-display">${media}</div>
        <div class="sub">${alunos.length} alunos no filtro</div>
      </div>
      <div class="indicator">
        <div class="label">Frequência geral</div>
        <div class="value num-display">${frequencia}%</div>
        <div class="sub">média do período</div>
      </div>
      <div class="indicator">
        <div class="label">Alunos em dificuldade</div>
        <div class="value num-display">${emDificuldade}</div>
        <div class="sub">atenção ou crítico</div>
      </div>
      <div class="indicator">
        <div class="label">Taxa de evolução</div>
        <div class="value num-display">${tendencia > 0 ? "+" : ""}${tendencia}</div>
        <div class="sub">desde o 1º bimestre</div>
      </div>
    `;
  }

  function mediaPorBimestre(alunos) {
    if (!alunos.length) return EDU.bimestres.map(() => 0);
    return EDU.bimestres.map((_, bi) =>
      +(alunos.reduce((s, a) => s + a.evolucao[bi], 0) / alunos.length).toFixed(2)
    );
  }

  function renderGraficoTurma() {
    if (!window.Chart) return;
    const alunos = alunosNoEscopo();
    const dados = mediaPorBimestre(alunos);
    try {
      if (graficoTurma) graficoTurma.destroy();
      graficoTurma = new Chart(document.getElementById("grafico-turma"), {
        type: "line",
        data: {
          labels: EDU.bimestres,
          datasets: [{
            label: "Média da turma",
            data: dados,
            borderColor: "#1f6f6b",
            backgroundColor: "rgba(31,111,107,0.12)",
            fill: true,
            tension: 0.25,
            pointRadius: 4
          }]
        },
        options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { min: 0, max: 10 } } }
      });
    } catch (erro) {
      console.error("Não foi possível carregar o gráfico (Chart.js).", erro);
    }
  }

  function renderAlertas() {
    const alunos = alunosNoEscopo()
      .filter(a => a.status !== "ok")
      .sort((a, b) => (a.status === "critico" ? -1 : 1) - (b.status === "critico" ? -1 : 1));

    const lista = document.getElementById("lista-alertas");
    if (alunos.length === 0) {
      lista.innerHTML = `<li class="empty">Nenhum alerta ativo nesta turma.</li>`;
      return;
    }
    lista.innerHTML = alunos.map(a => `
      <li class="alert-item ${a.status}">
        <div>
          <strong>${a.nome} · <span class="chip ${a.status}">${statusLabel[a.status]}</span></strong>
          ${a.alertas[0] || "Acompanhar desempenho."}
          <div><button class="who-link" data-ver="${a.id}">ver detalhes</button></div>
        </div>
      </li>
    `).join("");
    lista.querySelectorAll("[data-ver]").forEach(btn => {
      btn.addEventListener("click", () => {
        mostrarSecao("alunos");
        abrirDetalhe(btn.dataset.ver);
      });
    });
  }

  function renderTabelaAlunos(filtroTexto = "") {
    const alunos = alunosNoEscopo()
      .filter(a => a.nome.toLowerCase().includes(filtroTexto.toLowerCase()))
      .sort((a, b) => a.nome.localeCompare(b.nome));

    document.getElementById("tabela-alunos").innerHTML = alunos.map(a => `
      <tr data-id="${a.id}">
        <td>${a.nome}</td>
        <td>${a.mediaGeral}</td>
        <td>${a.frequencia}%</td>
        <td>${a.tendencia > 0 ? "+" : ""}${a.tendencia}</td>
        <td><span class="chip ${a.status}">${statusLabel[a.status]}</span></td>
      </tr>
    `).join("");

    document.querySelectorAll("#tabela-alunos tr").forEach(tr => {
      tr.addEventListener("click", () => abrirDetalhe(tr.dataset.id));
    });
  }

  function abrirDetalhe(alunoId) {
    const a = EDU.buscarAluno(alunoId);
    if (!a) return;
    const painel = document.getElementById("painel-detalhe");
    painel.style.display = "block";
    painel.innerHTML = `
      <h2>${a.nome}</h2>
      <p class="panel-sub">${a.turma} · frequência ${a.frequencia}% · <span class="chip ${a.status}">${statusLabel[a.status]}</span></p>
      <div class="table-scroll">
      <table>
        <thead><tr><th>Disciplina</th><th>1º Bim</th><th>2º Bim</th><th>3º Bim</th><th>4º Bim</th><th>Média</th></tr></thead>
        <tbody>
          ${EDU.disciplinas.map(d => {
            const info = a.disciplinas[d];
            return `<tr><td>${d}</td>${info.notas.map(n => `<td>${Number(n).toFixed(1)}</td>`).join("")}<td><strong>${info.media}</strong></td></tr>`;
          }).join("")}
        </tbody>
      </table>
      </div>
      ${a.alertas.length ? `<p class="panel-sub" style="margin-top:14px;">Alertas: ${a.alertas.join(" ")}</p>` : ""}
    `;
    painel.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function renderComparacao() {
    const alunos = alunosNoEscopo().sort((a, b) => a.nome.localeCompare(b.nome));
    const compA = document.getElementById("comp-a");
    const compB = document.getElementById("comp-b");
    [compA, compB].forEach(sel => {
      sel.innerHTML = alunos.map(a => `<option value="${a.id}">${a.nome}</option>`).join("");
    });
    if (alunos.length > 1) compB.selectedIndex = 1;
    atualizarGraficoComparacao();
  }

  function atualizarGraficoComparacao() {
    if (!window.Chart) return;
    const a = EDU.buscarAluno(document.getElementById("comp-a").value);
    const b = EDU.buscarAluno(document.getElementById("comp-b").value);
    if (!a || !b) return;
    try {
      if (graficoComparacao) graficoComparacao.destroy();
      graficoComparacao = new Chart(document.getElementById("grafico-comparacao"), {
        type: "line",
        data: {
          labels: EDU.bimestres,
          datasets: [
            { label: a.nome, data: a.evolucao, borderColor: "#1f6f6b", backgroundColor: "transparent", tension: 0.25, pointRadius: 4 },
            { label: b.nome, data: b.evolucao, borderColor: "#b0741f", backgroundColor: "transparent", tension: 0.25, pointRadius: 4 }
          ]
        },
        options: { responsive: true, scales: { y: { min: 0, max: 10 } } }
      });
    } catch (erro) {
      console.error("Não foi possível carregar o gráfico (Chart.js).", erro);
    }
  }

  function renderProfessores() {
    const professores = EDU.listarProfessores();
    document.getElementById("lista-professores").innerHTML = professores.map(p => {
      const m = p.avaliacao || { clareza: 0, organizacao: 0, engajamento: 0, disponibilidade: 0 };
      const linha = (label, val) => `
        <div class="metric-row">
          <span class="m-label">${label}</span>
          <div class="bar-track"><div class="bar-fill" style="width:${(val || 0) * 10}%"></div></div>
          <span class="m-val">${val ?? 0}</span>
        </div>`;
      return `
        <div class="teacher-card">
          <h3>${p.nome}</h3>
          <div class="disc">${p.disciplina} · ${(p.turmas || []).join(", ") || "sem turmas"}</div>
          ${linha("Clareza", m.clareza)}
          ${linha("Organização", m.organizacao)}
          ${linha("Engajamento", m.engajamento)}
          ${linha("Disponibilidade", m.disponibilidade)}
          <ul class="comment-list">${(p.comentarios || []).map(c => `<li>${c}</li>`).join("")}</ul>
        </div>
      `;
    }).join("");
  }

  function formatarTempo(seg) {
    const m = Math.floor(seg / 60);
    const s = Math.round(seg % 60);
    return `${m}m ${String(s).padStart(2, "0")}s`;
  }

  function formatarQuando(iso) {
    const d = new Date(iso);
    return d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  }

  async function renderNotificacoes() {
    const turmasAlvo = turmaAtual() ? [turmaAtual()] : professor.turmas;
    const notifs = await EDU_ATIVIDADES.notificacoesPorTurmas(turmasAlvo);       // ← await
    const todas = await EDU_ATIVIDADES.notificacoesPorTurmas(professor.turmas);  // ← await
    const badge = document.getElementById("badge-notif");
    const naoLidasTotal = todas.filter(n => !n.lida).length;
    badge.style.display = naoLidasTotal > 0 ? "inline-block" : "none";
    badge.textContent = naoLidasTotal;

    const lista = document.getElementById("lista-notificacoes");
    if (notifs.length === 0) {
      lista.innerHTML = `<p class="empty">Nenhum aluno concluiu atividades ainda.</p>`;
      return;
    }

    lista.innerHTML = notifs.map(n => {
      const aluno = EDU.buscarAluno(n.alunoId);
      const assuntos = [...new Set((n.questoesLentas || []).map(q => q.assunto))];
      return `
        <div class="notif-card ${n.lida ? "" : "unread"}" data-id="${n.id ?? ""}">
          <div class="notif-top">
            <strong>${n.lida ? "" : `<span class="new-dot"></span>`}${aluno ? aluno.nome : "Aluno"} concluiu "${n.titulo}"</strong>
            <span class="notif-time">${formatarQuando(n.concluidoEm)}</span>
          </div>
          <div class="panel-sub" style="margin:0;">
            ${n.turma} · ${n.disciplina} · tempo total ${formatarTempo(n.tempoTotalSeg)} ·
            acertos ${n.acertos}/${n.totalQuestoes}
          </div>
          <p style="margin:10px 0 0; font-size:13.5px;">
            Questões em que o aluno mais demorou:
          </p>
          <ul class="notif-slow">
            ${(n.questoesLentas || []).map(q => `<li>Questão ${q.numero} — ${q.assunto} (${formatarTempo(q.tempoSeg)})</li>`).join("")}
          </ul>
          <div class="notif-reco">
            Sugestão: reforçar ${assuntos.join(" e ")} com ${aluno ? aluno.nome.split(" ")[0] : "este aluno"} —
            o tempo gasto nessas questões, bem acima das demais, indica insegurança nesses assuntos
            específicos, mesmo quando o restante da atividade foi resolvido dentro do esperado.
          </div>
        </div>
      `;
    }).join("");

    lista.querySelectorAll(".notif-card").forEach(card => {
      card.addEventListener("click", async () => {
        const id = card.dataset.id;
        if (id) await EDU_ATIVIDADES.marcarLida(id);   // ← await, por uuid
        renderNotificacoes();
      });
    });
  }

  function renderTudo() {
    renderIndicadores();
    renderGraficoTurma();
    renderAlertas();
    renderTabelaAlunos(document.getElementById("busca-aluno").value);
    renderComparacao();
    renderNotificacoes();
  }

  filtroTurma.addEventListener("change", renderTudo);
  document.getElementById("busca-aluno").addEventListener("input", e => renderTabelaAlunos(e.target.value));
  document.getElementById("comp-a").addEventListener("change", atualizarGraficoComparacao);
  document.getElementById("comp-b").addEventListener("change", atualizarGraficoComparacao);

  const secoes = ["visao-geral", "alunos", "comparacao", "professores", "notificacoes"];
  function mostrarSecao(nome) {
    secoes.forEach(s => {
      document.getElementById("secao-" + s).style.display = s === nome ? "block" : "none";
    });
    document.querySelectorAll(".sidebar .nav-item").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.secao === nome);
    });
    document.getElementById("sidebar")?.classList.remove("open");
    if (nome === "visao-geral") renderGraficoTurma();
    if (nome === "comparacao") atualizarGraficoComparacao();
    if (nome === "notificacoes") renderNotificacoes();
  }
  document.querySelectorAll(".sidebar .nav-item").forEach(btn => {
    btn.addEventListener("click", () => mostrarSecao(btn.dataset.secao));
  });

  document.getElementById("btn-menu")?.addEventListener("click", () => {
    document.getElementById("sidebar").classList.toggle("open");
  });

  renderProfessores();
  renderNotificacoes();
  renderTudo();
}