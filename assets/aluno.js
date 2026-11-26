const sessao = EDU_AUTH.exigir("aluno");
if (sessao) {
  const aluno = EDU.buscarAluno(sessao.id);

  document.getElementById("who-name").textContent = aluno.nome;
  document.getElementById("who-turma").textContent = aluno.turma;
  document.getElementById("titulo").textContent = `Olá, ${aluno.nome.split(" ")[0]}`;
  document.getElementById("user-name").textContent = aluno.nome;
  document.getElementById("user-avatar").textContent = aluno.nome.charAt(0).toUpperCase();

  const statusLabel = { ok: "Em dia", atencao: "Atenção", critico: "Crítico" };

  function iconPorDisciplina(disc) {
    const svg = p => `<svg class="ico" viewBox="0 0 24 24">${p}</svg>`;
    const map = {
      "Matemática": svg('<line x1="5" y1="12" x2="19" y2="12"/><line x1="12" y1="5" x2="12" y2="5.01"/><line x1="12" y1="19" x2="12" y2="19.01"/>'),
      "Português":  svg('<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>'),
      "Ciências":   svg('<path d="M9 3h6"/><path d="M10 3v6L4.5 19a1.5 1.5 0 0 0 1.3 2.2h12.4a1.5 1.5 0 0 0 1.3-2.2L14 9V3"/>'),
      "História":   svg('<path d="M3 22h18"/><path d="M6 18v-7"/><path d="M10 18v-7"/><path d="M14 18v-7"/><path d="M18 18v-7"/><path d="M12 2l9 5H3z"/>'),
    };
    return map[disc] || svg('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>');
  }

  // ---------- Atividades ----------
  function renderAtividades() {
    const atividades = EDU_ATIVIDADES.listarPorTurma(aluno.turma);
    const concluidas = EDU_ATIVIDADES.concluidasPorAluno(aluno.id);
    const lista = document.getElementById("lista-atividades");

    if (atividades.length === 0) {
      lista.innerHTML = `<p class="empty">Nenhuma atividade disponível para sua turma no momento.</p>`;
      return;
    }

    const pendentes = atividades.filter(a => !concluidas.includes(a.id));
    const feitas = atividades.filter(a => concluidas.includes(a.id));

    let html = `
      <div class="activity-banner">
        <div class="banner-icon"><svg class="ico" viewBox="0 0 24 24"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg></div>
        <div class="banner-body">
          <strong>Seu próximo passo começa aqui</strong>
          <p>${pendentes.length > 0
            ? `Você tem ${pendentes.length} atividade${pendentes.length > 1 ? 's' : ''} pendente${pendentes.length > 1 ? 's' : ''}. Resolva para continuar avançando.`
            : `Tudo em dia! Continue revisando o conteúdo das atividades concluídas.`}</p>
        </div>
      </div>`;

    pendentes.forEach(a => {
      html += `
        <div class="activity-card">
          <div class="activity-icon">${iconPorDisciplina(a.disciplina)}</div>
          <div class="activity-body">
            <h3>${a.titulo}</h3>
            <div class="meta">${a.disciplina} · ${a.questoes.length} questões</div>
          </div>
          <button class="go-btn" data-ir="${a.id}">Resolver agora</button>
        </div>`;
    });

    if (feitas.length > 0) {
      html += `<h3 class="section-subtitle">Seu histórico de aprendizado</h3>`;
      feitas.forEach(a => {
        html += `
          <div class="activity-card done">
            <div class="activity-icon">${iconPorDisciplina(a.disciplina)}</div>
            <div class="activity-body">
              <h3>${a.titulo}</h3>
              <div class="meta">${a.disciplina} · ${a.questoes.length} questões</div>
            </div>
            <span class="chip ok">Concluída</span>
          </div>`;
      });
    }

    lista.innerHTML = html;
    lista.querySelectorAll("[data-ir]").forEach(btn => {
      btn.addEventListener("click", () => {
        window.location.href = `atividade.html?id=${btn.dataset.ir}`;
      });
    });
  }

  // ---------- Meus professores ----------
  function renderProfessoresAluno() {
    const container = document.getElementById("lista-professores-aluno");
    const professores = EDU.listarProfessores().filter(p => (p.turmas || []).includes(aluno.turma));

    if (!professores.length) {
      container.innerHTML = `<p class="empty">Nenhum professor cadastrado para sua turma.</p>`;
      return;
    }

    container.innerHTML = professores.map(p => {
      const m = p.avaliacao || {};
      const linha = (label, val) => `
        <div class="metric-row">
          <span class="m-label">${label}</span>
          <div class="bar-track"><div class="bar-fill" style="width:${(val || 0) * 10}%"></div></div>
          <span class="m-val">${val ?? 0}</span>
        </div>`;
      return `
        <div class="teacher-card">
          <h3>${p.nome}</h3>
          <div class="disc">${p.disciplina}</div>
          ${linha("Clareza", m.clareza)}
          ${linha("Organização", m.organizacao)}
          ${linha("Engajamento", m.engajamento)}
          ${linha("Disponibilidade", m.disponibilidade)}
          <ul class="comment-list">${(p.comentarios || []).map(c => `<li>${c}</li>`).join("")}</ul>
        </div>`;
    }).join("");
  }

  // ---------- navegação ----------
  const secoes = ["desempenho", "atividades", "professores"];
  document.querySelectorAll(".sidebar .nav-item").forEach(btn => {
    btn.addEventListener("click", () => {
      secoes.forEach(s => {
        document.getElementById("secao-" + s).style.display = s === btn.dataset.secao ? "block" : "none";
      });
      document.querySelectorAll(".sidebar .nav-item").forEach(b => b.classList.toggle("active", b === btn));
      document.getElementById("sidebar").classList.remove("open");
      if (btn.dataset.secao === "atividades") renderAtividades();
      if (btn.dataset.secao === "professores") renderProfessoresAluno();
    });
  });

  document.getElementById("btn-menu").addEventListener("click", () => {
    document.getElementById("sidebar").classList.toggle("open");
  });

  renderAtividades();
  renderProfessoresAluno();

  // ---------- indicadores ----------
  const atividades = EDU_ATIVIDADES.listarPorTurma(aluno.turma);
  const concluidas = EDU_ATIVIDADES.concluidasPorAluno(aluno.id);
  const feitasNaTurma = atividades.filter(a => concluidas.includes(a.id)).length;

  const colegas = EDU.listarAlunos(aluno.turma);
  const ordenados = [...colegas].sort((a, b) => b.mediaGeral - a.mediaGeral);
  const posicao = ordenados.findIndex(c => c.id === aluno.id) + 1;

  document.getElementById("indicadores").innerHTML = `
    <div class="indicator">
      <div class="label">Média geral</div>
      <div class="value num-display">${aluno.mediaGeral}</div>
      <div class="sub">nas 4 disciplinas</div>
    </div>
    <div class="indicator">
      <div class="label">Frequência</div>
      <div class="value num-display">${aluno.frequencia}%</div>
      <div class="sub">no ano letivo</div>
    </div>
    <div class="indicator">
      <div class="label">Atividades concluídas</div>
      <div class="value num-display">${feitasNaTurma}/${atividades.length}</div>
      <div class="sub">total da turma</div>
    </div>
    <div class="indicator">
      <div class="label">Posição na turma</div>
      <div class="value num-display">${posicao}/${colegas.length}</div>
      <div class="sub">por média geral</div>
    </div>
  `;

  // ---------- gráfico ----------
  try {
    new Chart(document.getElementById("grafico-evolucao"), {
      type: "line",
      data: {
        labels: EDU.bimestres,
        datasets: [{
          label: "Sua média",
          data: aluno.evolucao,
          borderColor: "#0a0a0a",
          backgroundColor: "rgba(10,10,10,0.08)",
          fill: true,
          tension: 0.3,
          pointRadius: 4,
          pointBackgroundColor: "#0a0a0a",
          borderWidth: 2.5
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          y: { min: 0, max: 10, grid: { color: "#eef2f9" } },
          x: { grid: { display: false } }
        }
      }
    });
  } catch {
    document.getElementById("grafico-evolucao").insertAdjacentHTML(
      "afterend",
      '<p class="empty">Não foi possível carregar o gráfico (verifique sua conexão).</p>'
    );
  }

  // ---------- alertas ----------
  const listaAlertas = document.getElementById("lista-alertas");
  if (aluno.alertas.length === 0) {
    listaAlertas.innerHTML = `<li class="alert-item ok"><div><strong>Tudo em dia</strong>Nenhum aviso no momento — continue assim.</div></li>`;
  } else {
    listaAlertas.innerHTML = aluno.alertas.map(a => `
      <li class="alert-item ${aluno.status}">
        <div><strong>Aviso</strong>${a}</div>
      </li>
    `).join("");
  }

  // ---------- tabela ----------
  document.getElementById("tabela-notas").innerHTML = EDU.disciplinas.map(d => {
    const info = aluno.disciplinas[d];
    return `
      <tr>
        <td>${d}</td>
        ${info.notas.map(n => `<td>${n.toFixed(1)}</td>`).join("")}
        <td><strong>${info.media}</strong></td>
      </tr>`;
  }).join("");

  // ---------- recomendações ----------
  const recomendacoes = [];
  const piorDisciplina = EDU.disciplinas
    .map(d => ({ d, media: aluno.disciplinas[d].media }))
    .sort((a, b) => a.media - b.media)[0];

  if (piorDisciplina.media < 7) {
    recomendacoes.push(`Reforce ${piorDisciplina.d}, sua disciplina com menor média (${piorDisciplina.media}). Revisar os exercícios do último bimestre pode ajudar antes da próxima avaliação.`);
  }
  if (aluno.frequencia < 85) {
    recomendacoes.push(`Sua frequência está em ${aluno.frequencia}%. Faltas recorrentes afetam diretamente o acompanhamento do conteúdo — procure a coordenação se algo estiver dificultando sua presença.`);
  }
  if (aluno.tendencia < 0) {
    recomendacoes.push(`Seu rendimento caiu ${Math.abs(aluno.tendencia)} ponto(s) desde o início do ano. Organizar um cronograma semanal de revisão pode reverter essa tendência.`);
  }
  if (recomendacoes.length === 0) {
    recomendacoes.push("Seu desempenho está estável em todas as disciplinas. Mantenha a rotina de estudos atual.");
  }

  document.getElementById("lista-recomendacoes").innerHTML = recomendacoes.map(r => `
    <li class="alert-item"><div>${r}</div></li>
  `).join("");
}