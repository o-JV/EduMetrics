/* ============================================================
   EduMetrics — Atividades e resultados
   Agora as atividades vêm do Supabase (EDU._cache.atividades).
   Os resultados são gravados na tabela `resultados`.
   MANTÉM a mesma API pública usada por aluno.js / professor.js /
   atividade.js — apenas com `async` onde há acesso a dados.
   ============================================================ */

const EDU_ATIVIDADES = {

  /* ---------- listagem / busca (síncronas, usam cache) ---------- */
  listarPorTurma(turma) {
    return EDU._cache.atividades.filter(a => a.turma === turma);
  },
  buscar(id) {
    return EDU._cache.atividades.find(a => a.id === id);
  },

  /* Atividades que o aluno já concluiu. Lê dos resultados em cache. */
  concluidasPorAluno(alunoId) {
    return EDU._cache.resultados
      .filter(r => r.alunoId === alunoId)
      .map(r => r.atividadeId);
  },

  /* ---------------------------------------------------------
     Registrar conclusão — grava no Supabase (ou mock)
     Retorna o resultado no mesmo formato de antes.
     --------------------------------------------------------- */
  async registrarConclusao({ atividadeId, alunoId, respostas, temposSeg }) {
    const atividade = this.buscar(atividadeId);
    if (!atividade) throw new Error("Atividade não encontrada: " + atividadeId);

    const acertos = respostas.filter((r, i) => r === atividade.questoes[i].correta).length;
    const tempoTotalSeg = +temposSeg.reduce((a, b) => a + b, 0).toFixed(1);

    const ranking = temposSeg
      .map((t, i) => ({ indice: i, questao: atividade.questoes[i], tempo: t }))
      .sort((a, b) => b.tempo - a.tempo)
      .slice(0, 3);

    const questoesLentas = ranking.map(r => ({
      numero: r.indice + 1,
      assunto: r.questao.assunto,
      tempoSeg: r.tempo,
    }));

    const resultadoLocal = {
      atividadeId,
      alunoId,
      turma: atividade.turma,
      disciplina: atividade.disciplina,
      titulo: atividade.titulo,
      respostas,
      temposSeg,
      acertos,
      totalQuestoes: atividade.questoes.length,
      tempoTotalSeg,
      questoesLentas,
      concluidoEm: new Date().toISOString(),
      lida: false,
    };

    /* ---------- persistência ---------- */
    if (EDU._cache.origem === "supabase") {
      try {
        const [inserido] = await SB.req("resultados", {
          method: "POST",
          body: {
            atividade_id:   atividadeId,
            aluno_id:       alunoId,
            turma:          atividade.turma,
            disciplina:     atividade.disciplina,
            titulo:         atividade.titulo,
            respostas,
            tempos_seg:     temposSeg,
            acertos,
            total_questoes: atividade.questoes.length,
            tempo_total:    tempoTotalSeg,
            questoes_lentas: questoesLentas,
            lida:           false,
          },
        });
        // mantém o id uuid para marcarLida depois
        resultadoLocal.id = inserido?.id;
      } catch (erro) {
        console.error("[EduMetrics] Falha ao gravar resultado no Supabase:", erro);
      }
    }

    /* atualiza cache local para refletir imediatamente */
    EDU._cache.resultados.unshift(resultadoLocal);
    return resultadoLocal;
  },

  /* ---------------------------------------------------------
     Notificações do professor — filtra por turma(s)
     --------------------------------------------------------- */
  async notificacoesPorTurmas(turmas) {
    if (EDU._cache.origem === "supabase") {
      // Se o cache já está atualizado, usa ele. Se quiser sempre fresquinho,
      // descomente o bloco abaixo para refazer o fetch:
      /*
      try {
        const filtro = turmas.map(t => `turma=eq.${encodeURIComponent(t)}`).join(",");
        const rows = await SB.req(`resultados?select=*&or=(${filtro})&order=concluido_em.desc`);
        return rows.map(r => ({
          id: r.id,
          atividadeId: r.atividade_id,
          alunoId: r.aluno_id,
          turma: r.turma,
          disciplina: r.disciplina,
          titulo: r.titulo,
          respostas: r.respostas || [],
          temposSeg: r.tempos_seg || [],
          acertos: r.acertos,
          totalQuestoes: r.total_questoes,
          tempoTotalSeg: r.tempo_total,
          questoesLentas: r.questoes_lentas || [],
          concluidoEm: r.concluido_em,
          lida: r.lida,
        }));
      } catch (e) { console.error(e); }
      */
    }
    return EDU._cache.resultados
      .filter(r => turmas.includes(r.turma))
      .sort((a, b) => new Date(b.concluidoEm) - new Date(a.concluidoEm));
  },

  /* ---------------------------------------------------------
     Marcar como lida — aceita id (uuid) OU índice (fallback)
     O professor.js antigo chama com índice; mantivemos os dois.
     --------------------------------------------------------- */
  async marcarLida(idOuIndice) {
    const lista = EDU._cache.resultados;

    // Se for uuid (string com hífen) → busca por id
    // Se for número → trata como índice da lista atual
    let alvo;
    if (typeof idOuIndice === "number") {
      alvo = lista[idOuIndice];
    } else {
      alvo = lista.find(r => r.id === idOuIndice);
    }
    if (!alvo) return;

    alvo.lida = true;

    if (EDU._cache.origem === "supabase" && alvo.id) {
      try {
        await SB.req(`resultados?id=eq.${alvo.id}`, {
          method: "PATCH",
          body: { lida: true },
        });
      } catch (erro) {
        console.error("[EduMetrics] Falha ao marcar como lida no Supabase:", erro);
      }
    }
  },
};