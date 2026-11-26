const sessao = EDU_AUTH.exigir("aluno");

if (sessao) {
  const params = new URLSearchParams(window.location.search);
  const atividade = EDU_ATIVIDADES.buscar(params.get("id"));
  const aluno = EDU.buscarAluno(sessao.id);
  document.getElementById("who-name").textContent = aluno.nome;
  document.getElementById("user-name").textContent = aluno.nome;
  document.getElementById("user-avatar").textContent = aluno.nome.charAt(0).toUpperCase();

  if (!atividade) {
    document.getElementById("area-quiz").innerHTML = `
      <div class="panel">
        <h2>Atividade não encontrada</h2>
        <p class="panel-sub">Esse link não corresponde a nenhuma atividade disponível. Volte ao painel e escolha uma atividade na lista.</p>
        <button class="enter-btn" style="max-width:240px;" onclick="window.location.href='aluno.html'">Ver minhas atividades</button>
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

      document.getElementById("q-progresso").textContent =
        `Questão ${indiceAtual + 1} de ${atividade.questoes.length}`;
      document.getElementById("q-barra").style.width =
        `${(indiceAtual / atividade.questoes.length) * 100}%`;
      document.getElementById("q-enunciado").textContent = q.enunciado;

      const opcoes = document.getElementById("q-opcoes");
      opcoes.innerHTML = q.alternativas.map((alt, i) => `
        <label class="quiz-option">
          <input type="radio" name="opcao" value="${i}">
          <span>${alt}</span>
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
      btn.textContent = indiceAtual === atividade.questoes.length - 1
        ? "Concluir atividade" : "Próxima questão";
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

      const btn = document.getElementById("q-avancar");
      if (btn) { btn.disabled = true; btn.textContent = "Enviando…"; }

      const resultado = await EDU_ATIVIDADES.registrarConclusao({
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
        `${resultado.acertos} de ${resultado.totalQuestoes}`;
      document.getElementById("resumo-tempo").textContent =
        formatarTempo(resultado.tempoTotalSeg);
      const avisoResultado = document.querySelector(".summary-callout p");
      if (resultado.persistidoNoServidor) {
        avisoResultado.textContent = "Seu resultado foi enviado ao professor.";
      } else if (resultado.falhaPersistencia) {
        avisoResultado.textContent =
          "Não foi possível enviar seu resultado ao servidor. Ele ficará disponível apenas nesta sessão.";
      } else {
        avisoResultado.textContent =
          "Este ambiente está usando dados de demonstração; seu resultado ficará apenas nesta sessão.";
      }

      document.getElementById("resumo-lentas").innerHTML = (resultado.questoesLentas || []).map(q => `
        <li>
          <span class="slow-num">Questão ${q.numero}</span>
          <span class="slow-assunto">${q.assunto}</span>
          <span class="slow-time">${formatarTempo(q.tempoSeg)}</span>
        </li>
      `).join("");

      const assuntos = [...new Set((resultado.questoesLentas || []).map(q => q.assunto))];
      document.getElementById("resumo-reco-text").textContent = assuntos.length
        ? `Reforce ${assuntos.join(" e ")} — o tempo gasto nessas questões foi bem acima das demais, indicando insegurança nesses assuntos específicos.`
        : "Seu tempo foi consistente em todas as questões. Continue praticando para manter o ritmo.";
    }

    iniciarCronometroGlobal();
    renderQuestao();
  }
}