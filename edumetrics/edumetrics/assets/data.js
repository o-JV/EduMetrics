/* ============================================================
   EduMetrics — camada de acesso a dados
   Usa Supabase, mas mantém TODAS as APIs antigas:
     EDU.listarAlunos(turma)
     EDU.buscarAluno(id)
     EDU.listarProfessores()
     EDU.buscarProfessor(id)
     EDU.indicadoresTurma(turma)
     EDU.evolucaoTurma(turma)
     EDU.disciplinas, EDU.bimestres, EDU.turmas
   Chame `await EDU.carregarTudo()` uma vez por página antes de usar.
   ============================================================ */

const EDU_DISCIPLINAS = ["Matemática", "Português", "Ciências", "História"];
const BIMESTRES = ["1º Bim", "2º Bim", "3º Bim", "4º Bim"];

/* ---------- helpers ---------- */
function mediaArray(arr) {
  if (!arr.length) return 0;
  return +(arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1);
}

/* ---------- regras de alerta ---------- */
function severidade(aluno) {
  if (aluno.mediaGeral < 6 || aluno.frequencia < 75 || aluno.tendencia <= -1.2) return "critico";
  if (aluno.mediaGeral < 7 || aluno.frequencia < 85 || aluno.tendencia < -0.4) return "atencao";
  return "ok";
}

function gerarAlertas(aluno) {
  const alertas = [];
  if (aluno.mediaGeral < 6) alertas.push(`Média geral abaixo do esperado (${aluno.mediaGeral}).`);
  if (aluno.frequencia < 75) alertas.push(`Frequência crítica (${aluno.frequencia}%).`);
  else if (aluno.frequencia < 85) alertas.push(`Frequência em queda (${aluno.frequencia}%).`);
  if (aluno.tendencia <= -1.2) alertas.push(`Queda acentuada de rendimento (${aluno.tendencia} pts desde o 1º bimestre).`);
  else if (aluno.tendencia < -0.4) alertas.push(`Tendência de queda no rendimento (${aluno.tendencia} pts).`);
  EDU_DISCIPLINAS.forEach(d => {
    if (aluno.disciplinas?.[d]?.media < 5) alertas.push(`Nota baixa em ${d} (${aluno.disciplinas[d].media}).`);
  });
  return alertas;
}

/* ============================================================
   MOCK LOCAL — fallback quando o Supabase não está configurado
   ou retornou vazio (RLS mal configurado / seed não rodado)
   ============================================================ */
function construirMock() {
  const NOMES = [
    "Ana Beatriz Souza", "Bruno Carvalho Lima", "Caio Ferreira Dias",
    "Débora Nascimento", "Eduardo Ramos Silva", "Fernanda Alves Pinto",
    "Gabriel Moura Costa", "Helena Torres Rocha", "Igor Barbosa Neto",
    "Júlia Martins Cruz", "Kaique Oliveira Reis", "Larissa Pereira Gois",
    "Marcos Vinícius Teixeira", "Nathália Campos Freire", "Otávio Lopes Borges",
    "Patrícia Gomes Xavier"
  ];
  const PERFIS = [8.6,5.4,4.8,9.1,6.7,7.9,5.9,8.2,4.2,7.1,6.3,8.8,5.1,7.6,6.9,4.6];
  const TURMAS = ["9º Ano A", "9º Ano B"];

  function gerarNotas(base, variacao) {
    return BIMESTRES.map((_, i) => {
      const ruido = Math.sin(base * 13 + i * 7) * variacao;
      return Math.max(0, Math.min(10, +(base + ruido).toFixed(1)));
    });
  }

  const alunos = NOMES.map((nome, i) => {
    const turma = TURMAS[i % 2];
    const base = PERFIS[i];
    const frequencia = Math.max(58, Math.min(100, Math.round(base * 10 + (i % 3 === 0 ? -12 : 2))));

    const disciplinas = {};
    EDU_DISCIPLINAS.forEach((d, di) => {
      const notas = gerarNotas(base + (di - 1.5) * 0.35, 1.4);
      disciplinas[d] = { notas, media: mediaArray(notas) };
    });

    const mediaGeral = mediaArray(EDU_DISCIPLINAS.map(d => disciplinas[d].media));
    const evolucao = BIMESTRES.map((_, bi) =>
      mediaArray(EDU_DISCIPLINAS.map(d => disciplinas[d].notas[bi]))
    );
    const tendencia = +(evolucao[evolucao.length - 1] - evolucao[0]).toFixed(1);

    return {
      id: "al-" + (i + 1),
      nome, turma, frequencia, disciplinas, mediaGeral, evolucao, tendencia,
    };
  });

  alunos.forEach(a => {
    a.status = severidade(a);
    a.alertas = gerarAlertas(a);
  });

  const professores = [
    { id: "pr-1", nome: "Prof. Carlos Menezes", disciplina: "Matemática", turmas: ["9º Ano A","9º Ano B"],
      avaliacao: { clareza: 8.4, organizacao: 9.0, engajamento: 7.6, disponibilidade: 8.1 },
      comentarios: ["Explica com muitos exemplos práticos.","Aulas bem estruturadas, mas ritmo acelerado."] },
    { id: "pr-2", nome: "Profa. Renata Aquino", disciplina: "Português", turmas: ["9º Ano A"],
      avaliacao: { clareza: 9.1, organizacao: 8.6, engajamento: 8.9, disponibilidade: 9.3 },
      comentarios: ["Muito atenciosa fora do horário de aula.","Incentiva a participação da turma."] },
    { id: "pr-3", nome: "Prof. Diego Fontoura", disciplina: "Ciências", turmas: ["9º Ano B"],
      avaliacao: { clareza: 7.2, organizacao: 6.8, engajamento: 8.3, disponibilidade: 7.0 },
      comentarios: ["Aulas dinâmicas, com experimentos.","Poderia disponibilizar mais material de apoio."] },
    { id: "pr-4", nome: "Profa. Isabel Rangel", disciplina: "História", turmas: ["9º Ano A","9º Ano B"],
      avaliacao: { clareza: 8.0, organizacao: 8.2, engajamento: 7.4, disponibilidade: 8.5 },
      comentarios: ["Contextualiza bem os temas atuais.","Correção de provas demora um pouco."] },
  ];

  return { turmas: TURMAS, alunos, professores };
}

/* ============================================================
   EDU — fachada única usada por todo o app
   ============================================================ */
const EDU = {
  disciplinas: EDU_DISCIPLINAS,
  bimestres: BIMESTRES,
  turmas: [],

  _cache: {
    alunos: [],
    professores: [],
    atividades: [],
    resultados: [],
    origem: "mock",
  },

  async carregarTudo() {
    if (!SB.configurado()) {
      console.warn("[EduMetrics] Supabase não configurado — usando dados mock.");
      this._carregarMock();
      return;
    }

    try {
      const [turmas, alunos, professores, atividades, questoes, notas, resultados, profTurmas] =
        await Promise.all([
          SB.req("turmas?select=*"),
          SB.req("alunos?select=*"),
          SB.req("professores?select=*"),
          SB.req("atividades?select=*"),
          SB.req("questoes?select=*&order=ordem"),
          SB.req("notas?select=*"),
          SB.req("resultados?select=*&order=concluido_em.desc"),
          SB.req("professor_turmas?select=*"),
        ]);

      /* ---- valida que veio algo do banco; senão cai no mock ---- */
      if (!alunos.length || !turmas.length) {
        console.warn(
          "[EduMetrics] Supabase respondeu, mas veio vazio (alunos/turmas). " +
          "Provavelmente seed.sql não foi rodado ou o RLS está bloqueando. " +
          "Usando mock temporariamente."
        );
        this._carregarMock();
        return;
      }

      this.turmas = turmas.map(t => t.nome);

      /* ---- mapa id→nome de turma, para cruzar com professores ---- */
      const turmaIdParaNome = Object.fromEntries(turmas.map(t => [t.id, t.nome]));

      /* ---------- Professores ---------- */
      this._cache.professores = professores.map(p => ({
        id: p.id,
        nome: p.nome,
        disciplina: p.disciplina,
        turmas: profTurmas
          .filter(pt => pt.professor_id === p.id)
          .map(pt => turmaIdParaNome[pt.turma_id])
          .filter(Boolean),
        avaliacao: p.avaliacao || { clareza: 0, organizacao: 0, engajamento: 0, disponibilidade: 0 },
        comentarios: p.comentarios || [],
      }));

      /* ---------- Alunos ---------- */
      this._cache.alunos = alunos.map(a => {
        const disciplinas = {};
        EDU_DISCIPLINAS.forEach(d => {
          const ns = notas
            .filter(n => n.aluno_id === a.id && n.disciplina === d)
            .sort((x, y) => x.bimestre - y.bimestre)
            .map(n => +n.nota);
          disciplinas[d] = {
            notas: ns.length ? ns : [0, 0, 0, 0],
            media: mediaArray(ns),
          };
        });

        const evolucao = BIMESTRES.map((_, i) =>
          mediaArray(EDU_DISCIPLINAS.map(d => disciplinas[d].notas[i] ?? 0))
        );
        const mediaGeral = mediaArray(EDU_DISCIPLINAS.map(d => disciplinas[d].media));
        const tendencia = +(evolucao[evolucao.length - 1] - evolucao[0]).toFixed(1);

        const aluno = {
          id: a.id,
          nome: a.nome,
          turma: turmaIdParaNome[a.turma_id] || a.turma_id,
          frequencia: a.frequencia,
          disciplinas, mediaGeral, evolucao, tendencia,
        };
        aluno.status = severidade(aluno);
        aluno.alertas = gerarAlertas(aluno);
        return aluno;
      });

      /* ---------- Atividades + questões ---------- */
      this._cache.atividades = atividades.map(a => ({
        id: a.id,
        titulo: a.titulo,
        disciplina: a.disciplina,
        turma: turmaIdParaNome[a.turma_id] || a.turma_id,
        questoes: questoes
          .filter(q => q.atividade_id === a.id)
          .map((q, i) => ({
            id: i + 1,
            assunto: q.assunto,
            enunciado: q.enunciado,
            alternativas: q.alternativas,
            correta: q.correta,
          })),
      }));

      /* ---------- Resultados ---------- */
      this._cache.resultados = resultados.map(r => ({
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

      this._cache.origem = "supabase";
      console.info(
        `[EduMetrics] Supabase OK — ` +
        `${this._cache.alunos.length} alunos, ` +
        `${this._cache.professores.length} professores, ` +
        `${this._cache.atividades.length} atividades.`
      );
    } catch (erro) {
      console.error("[EduMetrics] Falha ao carregar do Supabase, usando mock:", erro);
      this._carregarMock();
    }
  },

  _carregarMock() {
    const m = construirMock();
    this.turmas = m.turmas;
    this._cache.alunos = m.alunos;
    this._cache.professores = m.professores;
    this._cache.atividades = [];
    this._cache.resultados = [];
    this._cache.origem = "mock";
  },

  /* ---------- leitura ---------- */
  listarAlunos(turma) {
    return turma
      ? this._cache.alunos.filter(a => a.turma === turma)
      : this._cache.alunos.slice();
  },
  buscarAluno(id)      { return this._cache.alunos.find(a => a.id === id); },
  listarProfessores()  { return this._cache.professores.slice(); },
  buscarProfessor(id)  { return this._cache.professores.find(p => p.id === id); },

  indicadoresTurma(turma) {
    const alunos = this.listarAlunos(turma);
    if (!alunos.length) return { media: 0, frequencia: 0, emDificuldade: 0, tendenciaMedia: 0, total: 0 };
    return {
      media: mediaArray(alunos.map(a => a.mediaGeral)),
      frequencia: Math.round(mediaArray(alunos.map(a => a.frequencia))),
      emDificuldade: alunos.filter(a => a.status !== "ok").length,
      tendenciaMedia: +mediaArray(alunos.map(a => a.tendencia)).toFixed(1),
      total: alunos.length,
    };
  },
  evolucaoTurma(turma) {
    const alunos = this.listarAlunos(turma);
    if (!alunos.length) return BIMESTRES.map(() => 0);
    return BIMESTRES.map((_, bi) => mediaArray(alunos.map(a => a.evolucao[bi])));
  },
};

/* ---------- Validação de login (mock — trocar por auth real depois) ---------- */
const SENHA_PADRAO = "123456";
function validarCredencial(papel, id, senha) {
  const existe = papel === "aluno" ? EDU.buscarAluno(id) : EDU.buscarProfessor(id);
  if (!existe) return { ok: false, motivo: "Conta não encontrada." };
  if (senha !== SENHA_PADRAO) return { ok: false, motivo: "Senha incorreta." };
  return { ok: true };
}