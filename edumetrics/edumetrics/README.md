# EduMetrics — protótipo (sem banco de dados)

Protótipo estático em HTML, CSS e JavaScript puro. Os dados são simulados em
`assets/data.js` (em memória) — não há backend nem persistência real.

## Como rodar

1. Abra a pasta `edumetrics` no VS Code.
2. Clique com o botão direito em `index.html` → **Open with Live Server**
   (ou use a extensão Live Server / qualquer servidor estático).
3. Na tela de login, escolha "Sou professor(a)" ou "Sou aluno(a)", selecione
   um nome na lista, digite a senha **123456** (mesma para todas as contas de
   demonstração) e clique em **Entrar no painel**. Qualquer outra senha é
   recusada pela validação.

Não é necessário `npm install` nem configurar nada além do Live Server.
A única dependência externa é o Chart.js, carregado via CDN.

## Estrutura

```
edumetrics/
├── index.html              → login / seleção de perfil
├── pages/
│   ├── aluno.html           → painel do aluno
│   └── professor.html       → painel do professor
├── pages/
│   ├── aluno.html            → painel do aluno
│   ├── professor.html        → painel do professor
│   └── atividade.html         → resolução de uma atividade (quiz)
├── assets/
│   ├── style.css              → design tokens, layout e responsividade
│   ├── data.js                 → alunos, professores, credenciais e regras de alerta
│   ├── activities.js            → atividades (questões) e resultados (localStorage)
│   ├── auth.js                  → sessão local (localStorage)
│   ├── aluno.js                  → lógica do painel do aluno
│   ├── professor.js               → lógica do painel do professor
│   └── atividade.js                → lógica do quiz (cronômetro por questão)
└── README.md
```

## O que está implementado

- **Login com validação de conta e senha**: seleciona-se aluno ou professor e
  uma conta da lista; a senha (`123456` para todas as contas de demonstração)
  é conferida em `data.js` e uma mensagem de erro aparece se estiver errada
  ou se a conta não existir.
- **Layout responsivo**: sidebar vira menu retrátil (☰) em telas estreitas,
  cartões de indicador se reorganizam e tabelas longas ganham rolagem
  horizontal própria, em vez de quebrar o layout.
- **Dados fictícios** para 16 alunos em 2 turmas e 4 professores, gerados em
  `data.js`, para testar todas as telas sem precisar de banco de dados.
- **Painel do aluno**: indicadores pessoais, gráfico de evolução, notas por
  disciplina, alertas e recomendações geradas a partir dos próprios dados.
- **Atividades para os alunos resolverem**: cada turma tem uma atividade com
  questões de múltipla escolha marcadas por assunto (ex.: "Frações",
  "Equações do 1º grau"). O aluno resolve uma questão por vez; o tempo gasto
  em cada questão é cronometrado de verdade (via `performance.now()`), não
  simulado.
- **Resultado da atividade chega ao professor automaticamente**: ao concluir,
  o resultado (respostas, acertos, tempo total e tempo por questão) é salvo e
  aparece na aba **Atividades** do painel do professor como uma notificação,
  mostrando:
  - as 3 questões em que o aluno mais demorou (ex.: "Questão 5, 7 e 8");
  - o assunto de cada uma dessas questões;
  - uma sugestão de reforço, explicando que o tempo bem acima das demais
    questões indica insegurança específica naquele assunto — mesmo que o
    restante da atividade tenha sido resolvido dentro do esperado.
- **Painel do professor** (demais seções): indicadores da turma, filtro por
  turma, gráfico de evolução, alertas inteligentes (regra combinando média,
  frequência e tendência), lista de alunos com busca e detalhe individual,
  comparação de dois alunos lado a lado, e avaliação dos professores por
  critério com comentários.

## Sobre a "notificação em 2 minutos"

Não há backend nem WebSocket neste protótipo, então a notificação não chega
por push: ela fica salva no `localStorage` do navegador assim que o aluno
conclui a atividade, e aparece para o professor a próxima vez que ele abrir
(ou atualizar) a aba **Atividades**. Como os dois painéis rodam no mesmo
navegador durante a demonstração, isso é suficiente para simular o fluxo
completo; numa versão com banco de dados, essa gravação viraria uma chamada
de API e a notificação poderia ser em tempo real (ex.: via WebSocket).

## Próximos passos sugeridos

Para sair do protótipo, `assets/data.js` foi propositalmente centralizado em
um objeto `EDU` (camada de acesso a dados) — trocar seus métodos por chamadas
`fetch()` a uma API real é o único ponto de integração necessário quando o
banco de dados existir.
