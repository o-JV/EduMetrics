const sessao = EDU_AUTH.exigir("professor");
const statusLabel = { ok: "Em dia", atencao: "Atenção", critico: "Crítico" };

if (sessao) {
  const professor = EDU.buscarProfessor(sessao.id);

  if (!professor) {
    document.body.innerHTML = `
      <div class="login-wrap">
        <div class="login-card">
          <div class="brand"><img class="brand-logo" src="../assets/logo/icon.png" alt="">Edu<span>Metrics</span></div>
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
  let filtroMateriaNotificacao = "todas";

  document.getElementById("who-name").textContent = professor.nome;
  document.getElementById("who-disc").textContent = professor.disciplina;
  document.getElementById("user-name").textContent = professor.nome;
  document.getElementById("user-avatar").textContent =
    professor.nome.replace("Prof. ", "").replace("Profa. ", "").charAt(0).toUpperCase();

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
    const emAtencao = alunos.filter(a => a.status !== "ok").length;

    document.getElementById("indicadores").innerHTML = `
      <div class="indicator">
        <div class="label">Alunos na turma</div>
        <div class="value num-display">${alunos.length}</div>
        <div class="sub">no filtro atual</div>
      </div>
      <div class="indicator">
        <div class="label">Média da turma</div>
        <div class="value num-display">${media}</div>
        <div class="sub">nas 4 disciplinas</div>
      </div>
      <div class="indicator">
        <div class="label">Frequência média</div>
        <div class="value num-display">${frequencia}%</div>
        <div class="sub">no ano letivo</div>
      </div>
      <div class="indicator">
        <div class="label">Em atenção</div>
        <div class="value num-display">${emAtencao}</div>
        <div class="sub">alunos em atenção ou crítico</div>
      </div>
    `;
  }

  function mediaPorBimestre(alunos) {
    if (!alunos.length) return EDU.bimestres.map(() => 0);
    return EDU.bimestres.map((_, bi) =>
      +(alunos.reduce((s, a) => s + a.evolucao[bi], 0) / alunos.length).toFixed(2)
    );
  }

  function renderGraficoTurma(tentativa = 0) {
    if (!window.Chart) {
      mostrarAvisoEduMetrics("Não foi possível carregar o gráfico da turma.");
      return;
    }
    const canvas = document.getElementById("grafico-turma");
    if (!canvas) {
      mostrarAvisoEduMetrics("O elemento do gráfico da turma não foi encontrado.");
      return;
    }

    const wrap = canvas.parentElement;
    if (!wrap) {
      mostrarAvisoEduMetrics("Não foi possível localizar a área do gráfico da turma.");
      return;
    }
    if (wrap.clientWidth < 10 || wrap.clientHeight < 10) {
      if (document.getElementById("secao-visao-geral").style.display === "none") return;
      if (tentativa < 20) {
        setTimeout(() => renderGraficoTurma(tentativa + 1), 120);
      } else {
        mostrarAvisoEduMetrics("A área do gráfico da turma não ficou visível.");
      }
      return;
    }

    const dados = mediaPorBimestre(alunosNoEscopo());

    try {
      new Chart(canvas, {
        type: "line",
        data: {
          labels: EDU.bimestres,
          datasets: [{
            label: "Média da turma",
            data: dados,
            borderColor: "#0a0a0a",
            backgroundColor: "rgba(10,10,10,0.08)",
            fill: true,
            tension: 0.3,
            pointRadius: 4,
            borderWidth: 2.5
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: { min: 0, max: 10, grid: { color: "#eef2f9" } },
            x: { grid: { display: false } }
          }
        }
      });
    } catch {
      mostrarAvisoEduMetrics("Não foi possível desenhar o gráfico da turma.");
    }
  }

  function renderAlertas() {
    const alunos = alunosNoEscopo()
      .filter(a => a.status !== "ok")
      .sort((a, b) => (a.status === "critico" ? -1 : 1) - (b.status === "critico" ? -1 : 1));

    const lista = document.getElementById("lista-alertas");
    if (alunos.length === 0) {
      lista.innerHTML = `<li class="alert-item ok"><div><strong>Tudo em dia</strong>Nenhum alerta ativo nesta turma.</div></li>`;
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

  /* ---------- COMPARAÇÃO ---------- */

  function renderComparacao() {
    const alunos = alunosNoEscopo().sort((a, b) => a.nome.localeCompare(b.nome));
    const compA = document.getElementById("comp-a");
    const compB = document.getElementById("comp-b");

    if (alunos.length < 2) {
      compA.innerHTML = `<option>Sem alunos suficientes</option>`;
      compB.innerHTML = `<option>Sem alunos suficientes</option>`;
      compA.disabled = true;
      compB.disabled = true;
      return;
    }
    compA.disabled = false;
    compB.disabled = false;

    const prevA = compA.value;
    const prevB = compB.value;

    [compA, compB].forEach(sel => {
      sel.innerHTML = alunos.map(a => `<option value="${a.id}">${a.nome}</option>`).join("");
    });

    compA.value = alunos.some(a => a.id === prevA) ? prevA : alunos[0].id;
    compB.value = alunos.some(a => a.id === prevB) ? prevB : alunos[1].id;

    // evita que os dois selects mostrem o mesmo aluno
    if (compA.value === compB.value) {
      const idx = alunos.findIndex(a => a.id === compA.value);
      compB.value = alunos[(idx + 1) % alunos.length].id;
    }

    // SÓ cria o gráfico se a seção estiver visível
    const secao = document.getElementById("secao-comparacao");
    if (secao.style.display !== "none") {
      atualizarGraficoComparacao(0);
    }
  }

  function atualizarGraficoComparacao(tentativa = 0) {
    if (!window.Chart) {
      mostrarAvisoEduMetrics("Não foi possível carregar o gráfico de comparação.");
      return;
    }
    const canvas = document.getElementById("grafico-comparacao");
    const elA = document.getElementById("comp-a");
    const elB = document.getElementById("comp-b");
    if (!canvas || !elA || !elB || !elA.value || !elB.value) return;

    const wrap = canvas.parentElement;
    if (!wrap) {
      mostrarAvisoEduMetrics("Não foi possível localizar a área do gráfico de comparação.");
      return;
    }
    if (wrap.clientWidth < 10 || wrap.clientHeight < 10) {
      if (document.getElementById("secao-comparacao").style.display === "none") return;
      if (tentativa < 20) {
        setTimeout(() => atualizarGraficoComparacao(tentativa + 1), 120);
      } else {
        mostrarAvisoEduMetrics("A área do gráfico de comparação não ficou visível.");
      }
      return;
    }

    const a = EDU.buscarAluno(elA.value);
    const b = EDU.buscarAluno(elB.value);
    if (!a || !b) {
      mostrarAvisoEduMetrics("Não foi possível localizar os alunos selecionados.");
      return;
    }

    try {
      new Chart(canvas, {
        type: "line",
        data: {
          labels: EDU.bimestres,
          datasets: [
            {
              label: a.nome, data: a.evolucao,
              borderColor: "#0a0a0a", backgroundColor: "transparent",
              tension: 0.3, pointRadius: 4, borderWidth: 2.5
            },
            {
              label: b.nome, data: b.evolucao,
              borderColor: "#9ca3af", backgroundColor: "transparent", borderDash: [6, 4],
              tension: 0.3, pointRadius: 4, borderWidth: 2.5
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: "bottom",
              labels: { boxWidth: 10, boxHeight: 10, padding: 14 }
            }
          },
          scales: {
            y: { min: 0, max: 10, grid: { color: "#eef2f9" } },
            x: { grid: { display: false } }
          }
        }
      });
    } catch {
      mostrarAvisoEduMetrics("Não foi possível desenhar o gráfico de comparação.");
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
    const notificacoesTurma = await EDU_ATIVIDADES.notificacoesPorTurmas(turmasAlvo);
    const notifs = filtroMateriaNotificacao === "minha"
      ? notificacoesTurma.filter(n => n.disciplina === professor.disciplina)
      : notificacoesTurma;
    const todas = await EDU_ATIVIDADES.notificacoesPorTurmas(professor.turmas);

    const badge = document.getElementById("badge-notif");
    const naoLidasTotal = todas.filter(n => !n.lida).length;
    if (naoLidasTotal > 0) {
      badge.style.display = "inline-flex";
      badge.textContent = naoLidasTotal;
    } else {
      badge.style.display = "none";
    }

    const lista = document.getElementById("lista-notificacoes");
    if (notifs.length === 0) {
      lista.innerHTML = filtroMateriaNotificacao === "minha"
        ? `<p class="empty">Nenhum aluno concluiu atividades de ${professor.disciplina}.</p>`
        : `<p class="empty">Nenhum aluno concluiu atividades ainda.</p>`;
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
        if (id) await EDU_ATIVIDADES.marcarLida(id);
        renderNotificacoes();
      });
    });
  }

  function renderTudo() {
    renderIndicadores();
    if (document.getElementById("secao-visao-geral").style.display !== "none") renderGraficoTurma();
    renderAlertas();
    renderTabelaAlunos(document.getElementById("busca-aluno").value);
    renderComparacao();       // só popula selects — gráfico fica p/ quando a aba abrir
    renderNotificacoes();
  }

  filtroTurma.addEventListener("change", renderTudo);
  document.getElementById("busca-aluno").addEventListener("input", e => renderTabelaAlunos(e.target.value));
  document.querySelectorAll("[data-filtro-materia]").forEach(botao => {
    botao.addEventListener("click", () => {
      if (filtroMateriaNotificacao === botao.dataset.filtroMateria) return;
      filtroMateriaNotificacao = botao.dataset.filtroMateria;
      document.querySelectorAll("[data-filtro-materia]").forEach(opcao => {
        const ativo = opcao === botao;
        opcao.classList.toggle("active", ativo);
        opcao.setAttribute("aria-pressed", String(ativo));
      });
      renderNotificacoes();
    });
  });
  document.getElementById("comp-a").addEventListener("change", () => atualizarGraficoComparacao(0));
  document.getElementById("comp-b").addEventListener("change", () => atualizarGraficoComparacao(0));

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
    if (nome === "comparacao") renderComparacao();
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