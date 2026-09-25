const sessao = EDU_AUTH.exigir("aluno");
if (sessao) {
  const aluno = EDU.buscarAluno(sessao.id);

  document.getElementById("who-name").textContent = aluno.nome;
  document.getElementById("who-turma").textContent = aluno.turma;
  document.getElementById("titulo").textContent = `Olá, ${aluno.nome.split(" ")[0]}`;

  const statusLabel = { ok: "Em dia", atencao: "Atenção", critico: "Crítico" };

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
    const ordenadas = [...pendentes, ...feitas];

    const resumo = document.createElement("p");
    resumo.className = "panel-sub";
    resumo.style.marginTop = "-4px";
    resumo.textContent = `${feitas.length} de ${atividades.length} atividades concluídas.`;

    lista.innerHTML = "";
    lista.appendChild(resumo);

    ordenadas.forEach(a => {
      const feita = concluidas.includes(a.id);
      const card = document.createElement("div");
      card.className = `activity-card ${feita ? "done" : ""}`;
      card.innerHTML = `
        <div>
          <h3>${a.titulo}</h3>
          <div class="meta">${a.disciplina} · ${a.questoes.length} questões</div>
        </div>
        ${feita
          ? `<span class="chip ok">Concluída</span>`
          : `<button class="go-btn" data-ir="${a.id}">Resolver agora</button>`}
      `;
      lista.appendChild(card);
    });

    lista.querySelectorAll("[data-ir]").forEach(btn => {
      btn.addEventListener("click", () => {
        window.location.href = `atividade.html?id=${btn.dataset.ir}`;
      });
    });
  }

  // ---------- navegação entre seções + menu mobile ----------
  // Isto é configurado ANTES de qualquer renderização que dependa de
  // bibliotecas externas (como o gráfico), para que a navegação nunca
  // fique presa caso algo externo (ex.: CDN do Chart.js) falhe.
  const secoes = ["desempenho", "atividades"];
  document.querySelectorAll(".sidebar .nav-item").forEach(btn => {
    btn.addEventListener("click", () => {
      secoes.forEach(s => {
        document.getElementById("secao-" + s).style.display = s === btn.dataset.secao ? "block" : "none";
      });
      document.querySelectorAll(".sidebar .nav-item").forEach(b => b.classList.toggle("active", b === btn));
      document.getElementById("sidebar").classList.remove("open");
      if (btn.dataset.secao === "atividades") renderAtividades();
    });
  });

  document.getElementById("btn-menu").addEventListener("click", () => {
    document.getElementById("sidebar").classList.toggle("open");
  });

  renderAtividades();

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
      <div class="label">Tendência</div>
      <div class="value num-display">${aluno.tendencia > 0 ? "+" : ""}${aluno.tendencia}</div>
      <div class="sub">desde o 1º bimestre</div>
    </div>
    <div class="indicator">
      <div class="label">Situação</div>
      <div class="value"><span class="chip ${aluno.status}">${statusLabel[aluno.status]}</span></div>
      <div class="sub">avaliação combinada</div>
    </div>
  `;

  try {
    new Chart(document.getElementById("grafico-evolucao"), {
      type: "line",
      data: {
        labels: EDU.bimestres,
        datasets: [{
          label: "Sua média",
          data: aluno.evolucao,
          borderColor: "#1f6f6b",
          backgroundColor: "rgba(31,111,107,0.12)",
          fill: true,
          tension: 0.25,
          pointRadius: 4
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: { y: { min: 0, max: 10 } }
      }
    });
  } catch (erro) {
    console.error("Não foi possível carregar o gráfico (Chart.js).", erro);
    document.getElementById("grafico-evolucao").insertAdjacentHTML(
      "afterend",
      '<p class="empty">Não foi possível carregar o gráfico (verifique sua conexão com a internet).</p>'
    );
  }

  const listaAlertas = document.getElementById("lista-alertas");
  if (aluno.alertas.length === 0) {
    listaAlertas.innerHTML = `<li class="empty">Nenhum aviso no momento — continue assim.</li>`;
  } else {
    listaAlertas.innerHTML = aluno.alertas.map(a => `
      <li class="alert-item ${aluno.status}">
        <div><strong>Aviso</strong>${a}</div>
      </li>
    `).join("");
  }

  const corpoTabela = document.getElementById("tabela-notas");
  corpoTabela.innerHTML = EDU.disciplinas.map(d => {
    const info = aluno.disciplinas[d];
    return `
      <tr>
        <td>${d}</td>
        ${info.notas.map(n => `<td>${n.toFixed(1)}</td>`).join("")}
        <td><strong>${info.media}</strong></td>
      </tr>
    `;
  }).join("");

  // Recomendações: baseadas na disciplina mais fraca e na frequência.
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
    <li class="alert-item">
      <div>${r}</div>
    </li>
  `).join("");
}