const sessao = EDU_AUTH.exigir("aluno");

if (sessao) {
  const params = new URLSearchParams(window.location.search);
  const atividade = EDU_ATIVIDADES.buscar(params.get("id"));
  const aluno = EDU.buscarAluno(sessao.id);
  document.getElementById("who-name").textContent = aluno.nome;

  if (!atividade) {
    document.getElementById("area-quiz").innerHTML = `
      <div class="panel">
        <h2>Atividade não encontrada</h2>
        <p class="panel-sub">
          Esse link não corresponde a nenhuma atividade disponível. Volte ao painel e
          escolha uma atividade na lista para começar.
        </p>
        <button class="enter-btn" style="max-width:220px;" onclick="window.location.href='aluno.html'">Ver minhas atividades</button>
      </div>`;
  } else {
    document.getElementById("q-titulo").textContent = atividade.titulo;

    let indiceAtual = 0;
    let selecionada = null;
    const respostas = [];
    const temposSeg = [];
    let tInicioQuestao = performance.now();
    let tInicioTotal = performance.now();
    let cronometro = null;

    function formatarTempo(seg) {
      const m = Math.floor(seg / 60);
      const s = Math.round(seg % 60);
      return `${m}:${String(s).padStart(2, "0")}`;
    }

    function iniciarCronometroGlobal() {
      cronometro = setInterval(() => {
        const passados = (performance.now() - tInicioTotal) / 1000;
        document.getElementById("q-timer").textContent = formatarTempo(passados);
      }, 500);
    }

    function renderQuestao() {
      const q = atividade.questoes[indiceAtual];
      selecionada = null;
      tInicioQuestao = performance.now();

      document.getElementById("q-progresso").textContent = `Questão ${indiceAtual + 1} de ${atividade.questoes.length}`;
      document.getElementById("q-barra").style.width = `${(indiceAtual / atividade.questoes.length) * 100}%`;
      document.getElementById("q-enunciado").textContent = q.enunciado;

      const opcoes = document.getElementById("q-opcoes");
      opcoes.innerHTML = q.alternativas.map((alt, i) => `
        <label class="quiz-option">
          <input type="radio" name="opcao" value="${i}">
          ${alt}
        </label>
      `).join("");

      opcoes.querySelectorAll("input").forEach(inp => {
        inp.addEventListener("change", () => {
          selecionada = +inp.value;
          document.getElementById("q-avancar").disabled = false;
        });
      });

      const btn = document.getElementById("q-avancar");
      btn.disabled = true;
      btn.textContent = indiceAtual === atividade.questoes.length - 1 ? "Concluir atividade" : "Próxima questão";
    }

    document.getElementById("q-avancar").addEventListener("click", () => {
      if (selecionada === null) return;
      const tempoQuestaoSeg = (performance.now() - tInicioQuestao) / 1000;
      respostas.push(selecionada);
      temposSeg.push(+tempoQuestaoSeg.toFixed(1));

      if (indiceAtual < atividade.questoes.length - 1) {
        indiceAtual++;
        renderQuestao();
      } else {
        finalizar();
      }
    });

    async function finalizar() {
  clearInterval(cronometro);
  document.getElementById("q-barra").style.width = "100%";

  // mostra um estado "enviando" enquanto grava
  const btn = document.getElementById("q-avancar");
  if (btn) { btn.disabled = true; btn.textContent = "Enviando…"; }

  const resultado = await EDU_ATIVIDADES.registrarConclusao({   // ← await
    atividadeId: atividade.id,
    alunoId: aluno.id,
    respostas,
    temposSeg
  });

  document.getElementById("area-quiz").style.display = "none";
  const resumo = document.getElementById("area-resumo");
  resumo.style.display = "block";
  document.getElementById("resumo-sub").textContent =
    `${atividade.titulo} · ${atividade.disciplina}`;
  document.getElementById("resumo-acertos").textContent =
    `${resultado.acertos}/${resultado.totalQuestoes}`;
  document.getElementById("resumo-tempo").textContent =
    formatarTempo(resultado.tempoTotalSeg);
}

    iniciarCronometroGlobal();
    renderQuestao();
  }
}
