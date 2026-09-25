-- ============================================================
-- SEED EduMetrics
-- Limpa tudo antes (idempotente — pode rodar várias vezes)
-- ============================================================
truncate resultados, questoes, atividades, notas, alunos,
         professor_turmas, professores, turmas restart identity cascade;

-- ============================================================
-- TURMAS
-- ============================================================
insert into turmas (id, nome) values
  ('9A', '9º Ano A'),
  ('9B', '9º Ano B');

-- ============================================================
-- PROFESSORES
-- ============================================================
insert into professores (id, nome, disciplina, avaliacao, comentarios) values
  ('pr-1', 'Prof. Carlos Menezes',  'Matemática',
    '{"clareza":8.4,"organizacao":9.0,"engajamento":7.6,"disponibilidade":8.1}'::jsonb,
    '["Explica com muitos exemplos práticos.","Aulas bem estruturadas, mas ritmo acelerado."]'::jsonb),
  ('pr-2', 'Profa. Renata Aquino',  'Português',
    '{"clareza":9.1,"organizacao":8.6,"engajamento":8.9,"disponibilidade":9.3}'::jsonb,
    '["Muito atenciosa fora do horário de aula.","Incentiva a participação da turma."]'::jsonb),
  ('pr-3', 'Prof. Diego Fontoura',  'Ciências',
    '{"clareza":7.2,"organizacao":6.8,"engajamento":8.3,"disponibilidade":7.0}'::jsonb,
    '["Aulas dinâmicas, com experimentos.","Poderia disponibilizar mais material de apoio."]'::jsonb),
  ('pr-4', 'Profa. Isabel Rangel',  'História',
    '{"clareza":8.0,"organizacao":8.2,"engajamento":7.4,"disponibilidade":8.5}'::jsonb,
    '["Contextualiza bem os temas atuais.","Correção de provas demora um pouco."]'::jsonb);

insert into professor_turmas (professor_id, turma_id) values
  ('pr-1', '9A'), ('pr-1', '9B'),
  ('pr-2', '9A'),
  ('pr-3', '9B'),
  ('pr-4', '9A'), ('pr-4', '9B');

-- ============================================================
-- ALUNOS (16, alternando turma — mesmos nomes do mock antigo)
-- ============================================================
insert into alunos (id, nome, turma_id, frequencia) values
  ('al-1',  'Ana Beatriz Souza',       '9A', 85),
  ('al-2',  'Bruno Carvalho Lima',     '9B', 56),
  ('al-3',  'Caio Ferreira Dias',      '9A', 50),
  ('al-4',  'Débora Nascimento',       '9B', 93),
  ('al-5',  'Eduardo Ramos Silva',     '9A', 69),
  ('al-6',  'Fernanda Alves Pinto',    '9B', 81),
  ('al-7',  'Gabriel Moura Costa',     '9A', 61),
  ('al-8',  'Helena Torres Rocha',     '9B', 84),
  ('al-9',  'Igor Barbosa Neto',       '9A', 44),
  ('al-10', 'Júlia Martins Cruz',      '9B', 73),
  ('al-11', 'Kaique Oliveira Reis',    '9A', 65),
  ('al-12', 'Larissa Pereira Gois',    '9B', 90),
  ('al-13', 'Marcos Vinícius Teixeira','9A', 53),
  ('al-14', 'Nathália Campos Freire',  '9B', 78),
  ('al-15', 'Otávio Lopes Borges',     '9A', 71),
  ('al-16', 'Patrícia Gomes Xavier',   '9B', 48);

-- ============================================================
-- NOTAS  (geradas a partir das mesmas fórmulas determinísticas
--         usadas antes no mock — assim os gráficos ficam iguais)
-- ============================================================
insert into notas (aluno_id, disciplina, bimestre, nota)
select a.id, d.disciplina, b.bim, 
       greatest(0, least(10,
         round((
           (case a.id
              when 'al-1'  then 8.6 when 'al-2'  then 5.4 when 'al-3'  then 4.8 when 'al-4'  then 9.1
              when 'al-5'  then 6.7 when 'al-6'  then 7.9 when 'al-7'  then 5.9 when 'al-8'  then 8.2
              when 'al-9'  then 4.2 when 'al-10' then 7.1 when 'al-11' then 6.3 when 'al-12' then 8.8
              when 'al-13' then 5.1 when 'al-14' then 7.6 when 'al-15' then 6.9 when 'al-16' then 4.6
            end)
           + (d.idx - 1.5) * 0.35
           + sin((case a.id
              when 'al-1' then 8.6 when 'al-2' then 5.4 when 'al-3' then 4.8 when 'al-4' then 9.1
              when 'al-5' then 6.7 when 'al-6' then 7.9 when 'al-7' then 5.9 when 'al-8' then 8.2
              when 'al-9' then 4.2 when 'al-10' then 7.1 when 'al-11' then 6.3 when 'al-12' then 8.8
              when 'al-13' then 5.1 when 'al-14' then 7.6 when 'al-15' then 6.9 when 'al-16' then 4.6
            end) * 13 + (b.bim - 1) * 7) * 1.4
         )::numeric, 1)
       )) as nota
from alunos a
cross join (values (1,'Matemática'),(2,'Português'),(3,'Ciências'),(4,'História')) as d(idx, disciplina)
cross join (values (1),(2),(3),(4)) as b(bim);

-- ============================================================
-- ATIVIDADES + QUESTÕES
-- ============================================================
insert into atividades (id, titulo, disciplina, turma_id) values
  ('at-1', 'Revisão bimestral — Matemática', 'Matemática', '9A'),
  ('at-2', 'Revisão bimestral — Matemática', 'Matemática', '9B'),
  ('at-3', 'Interpretação de texto — Português', 'Português', '9A'),
  ('at-4', 'Ecossistemas — Ciências', 'Ciências', '9B'),
  ('at-5', 'Brasil República — História', 'História', '9A'),
  ('at-6', 'Brasil República — História', 'História', '9B');

-- at-1 (9A — Matemática)
insert into questoes (atividade_id, ordem, assunto, enunciado, alternativas, correta) values
  ('at-1', 1, 'Frações', 'Qual é o resultado de 3/4 + 1/2?',
   '["5/4","4/6","1","5/6"]'::jsonb, 0),
  ('at-1', 2, 'Frações', 'Simplificando 8/12, obtemos:',
   '["2/3","4/6","1/2","3/4"]'::jsonb, 0),
  ('at-1', 3, 'Equações do 1º grau', 'Se 2x + 6 = 14, então x vale:',
   '["3","4","5","8"]'::jsonb, 1),
  ('at-1', 4, 'Equações do 1º grau', 'A solução de 5x - 3 = 2x + 12 é:',
   '["3","4","5","6"]'::jsonb, 2),
  ('at-1', 5, 'Geometria — área', 'A área de um retângulo com 7 cm de base e 4 cm de altura é:',
   '["11 cm²","22 cm²","28 cm²","32 cm²"]'::jsonb, 2),
  ('at-1', 6, 'Geometria — área', 'Um quadrado de lado 6 cm tem área de:',
   '["12 cm²","24 cm²","36 cm²","46 cm²"]'::jsonb, 2),
  ('at-1', 7, 'Porcentagem', '20% de 150 é igual a:',
   '["20","25","30","35"]'::jsonb, 2),
  ('at-1', 8, 'Porcentagem', 'Um produto de R$ 80 com desconto de 15% custa:',
   '["R$ 65","R$ 68","R$ 70","R$ 72"]'::jsonb, 1);

-- at-2 (9B — Matemática)
insert into questoes (atividade_id, ordem, assunto, enunciado, alternativas, correta) values
  ('at-2', 1, 'Frações', 'Qual é o resultado de 2/3 + 1/6?',
   '["1/2","3/9","5/6","1"]'::jsonb, 2),
  ('at-2', 2, 'Equações do 1º grau', 'Se 3x - 4 = 11, então x vale:',
   '["3","4","5","6"]'::jsonb, 2),
  ('at-2', 3, 'Equações do 1º grau', 'A solução de 7x + 2 = 4x + 20 é:',
   '["4","5","6","7"]'::jsonb, 2),
  ('at-2', 4, 'Geometria — área', 'Um triângulo com base 10 cm e altura 6 cm tem área de:',
   '["16 cm²","30 cm²","60 cm²","36 cm²"]'::jsonb, 1),
  ('at-2', 5, 'Geometria — perímetro', 'O perímetro de um retângulo 5 cm x 9 cm é:',
   '["14 cm","28 cm","45 cm","18 cm"]'::jsonb, 1),
  ('at-2', 6, 'Porcentagem', '30% de 90 é igual a:',
   '["18","24","27","33"]'::jsonb, 2),
  ('at-2', 7, 'Porcentagem', 'Um valor de R$ 200 com acréscimo de 12% fica em:',
   '["R$ 212","R$ 220","R$ 224","R$ 232"]'::jsonb, 2);

-- at-3 (9A — Português)
insert into questoes (atividade_id, ordem, assunto, enunciado, alternativas, correta) values
  ('at-3', 1, 'Classes gramaticais', 'Na frase ''O aluno estudou muito'', a palavra ''muito'' é classificada como:',
   '["Substantivo","Advérbio","Pronome","Conjunção"]'::jsonb, 1),
  ('at-3', 2, 'Classes gramaticais', 'Qual palavra é um pronome na frase ''Ela entregou o trabalho a ele''?',
   '["Entregou","Trabalho","Ela","A"]'::jsonb, 2),
  ('at-3', 3, 'Concordância verbal', 'Assinale a frase com concordância verbal correta:',
   '["Os alunos chegou cedo.","Os alunos chegaram cedo.","Os aluno chegaram cedo.","Os alunos chega cedo."]'::jsonb, 1),
  ('at-3', 4, 'Figuras de linguagem', '''Chorei rios de lágrimas'' é um exemplo de:',
   '["Metáfora","Hipérbole","Ironia","Eufemismo"]'::jsonb, 1),
  ('at-3', 5, 'Figuras de linguagem', 'Dizer que alguém ''foi para um lugar melhor'' em vez de ''morreu'' é um exemplo de:',
   '["Metáfora","Hipérbole","Eufemismo","Antítese"]'::jsonb, 2),
  ('at-3', 6, 'Interpretação textual', 'O principal objetivo de um texto argumentativo é:',
   '["Narrar um fato","Convencer o leitor de um ponto de vista","Descrever um ambiente","Ensinar uma receita"]'::jsonb, 1);

-- at-4 (9B — Ciências)
insert into questoes (atividade_id, ordem, assunto, enunciado, alternativas, correta) values
  ('at-4', 1, 'Cadeia alimentar', 'Em uma cadeia alimentar, os produtores são geralmente:',
   '["Animais carnívoros","Plantas e algas","Fungos decompositores","Animais onívoros"]'::jsonb, 1),
  ('at-4', 2, 'Cadeia alimentar', 'Os decompositores têm a função de:',
   '["Produzir oxigênio","Caçar outros animais","Decompor matéria orgânica","Realizar fotossíntese"]'::jsonb, 2),
  ('at-4', 3, 'Ciclo da água', 'A passagem da água do estado líquido para o gasoso é chamada de:',
   '["Condensação","Evaporação","Precipitação","Infiltração"]'::jsonb, 1),
  ('at-4', 4, 'Ciclo da água', 'As nuvens se formam principalmente por meio da:',
   '["Evaporação","Condensação","Fotossíntese","Respiração"]'::jsonb, 1),
  ('at-4', 5, 'Ecossistemas', 'Um bioma caracterizado por baixa umidade e vegetação escassa é:',
   '["Floresta tropical","Deserto","Manguezal","Pântano"]'::jsonb, 1);

-- at-5 (9A — História)
insert into questoes (atividade_id, ordem, assunto, enunciado, alternativas, correta) values
  ('at-5', 1, 'Proclamação da República', 'A Proclamação da República no Brasil ocorreu em:',
   '["1822","1888","1889","1891"]'::jsonb, 2),
  ('at-5', 2, 'Proclamação da República', 'O primeiro presidente do Brasil República foi:',
   '["Dom Pedro II","Deodoro da Fonseca","Floriano Peixoto","Getúlio Vargas"]'::jsonb, 1),
  ('at-5', 3, 'Era Vargas', 'O período conhecido como Era Vargas se estendeu principalmente entre:',
   '["1889–1900","1930–1945","1945–1960","1964–1985"]'::jsonb, 1),
  ('at-5', 4, 'Era Vargas', 'Uma característica marcante do governo de Getúlio Vargas foi:',
   '["A criação da CLT (leis trabalhistas)","O fim da escravidão","A chegada da família real","A independência do Brasil"]'::jsonb, 0),
  ('at-5', 5, 'Ditadura Militar', 'O regime militar brasileiro teve início em:',
   '["1954","1964","1974","1985"]'::jsonb, 1);

-- at-6 (9B — História)
insert into questoes (atividade_id, ordem, assunto, enunciado, alternativas, correta) values
  ('at-6', 1, 'Proclamação da República', 'O militar que proclamou a República em 1889 foi:',
   '["Deodoro da Fonseca","Floriano Peixoto","Duque de Caxias","Getúlio Vargas"]'::jsonb, 0),
  ('at-6', 2, 'Era Vargas', 'O período do Estado Novo, dentro da Era Vargas, foi marcado por:',
   '["Eleições diretas","Centralização do poder e censura","Fim do trabalho industrial","Independência das províncias"]'::jsonb, 1),
  ('at-6', 3, 'Ditadura Militar', 'O regime militar no Brasil terminou oficialmente em:',
   '["1975","1980","1985","1990"]'::jsonb, 2),
  ('at-6', 4, 'Ditadura Militar', 'O AI-5 (Ato Institucional nº 5), de 1968, é associado a:',
   '["Ampliação de liberdades civis","Endurecimento da repressão política","Fim da censura","Redemocratização"]'::jsonb, 1),
  ('at-6', 5, 'Redemocratização', 'O movimento popular pelas eleições diretas, no fim da ditadura, ficou conhecido como:',
   '["Diretas Já","Revolta da Vacina","Semana de Arte Moderna","Marcha da Família"]'::jsonb, 0);