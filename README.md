# EduMetrics

Painel acadêmico demonstrativo para acompanhar desempenho, frequência, atividades e evolução de alunos.

O projeto é uma aplicação estática, feita com HTML, CSS e JavaScript puro. Não exige build nem instalação de dependências.

## Funcionalidades

- Login demonstrativo para perfis de aluno e professor.
- Indicadores, notas, alertas e recomendações para alunos.
- Visão geral da turma, busca e comparação de alunos para professores.
- Resultados de atividades com tempo por questão e sugestões de reforço.
- Filtro dos resultados por todas as matérias ou pela matéria do professor.
- Layout responsivo e gráficos desenhados pela implementação local em `assets/Chart.js`.

## Executar localmente

Sirva a pasta raiz com qualquer servidor estático. Por exemplo, com Python:

```bash
python -m http.server 8000
```

Depois, abra [http://localhost:8000](http://localhost:8000). Também é possível usar a extensão Live Server do VS Code. Evite abrir os HTMLs diretamente com `file://`, pois o navegador pode bloquear requisições ao Supabase.

As credenciais do login são demonstrativas: selecione um aluno ou professor e use a senha `123456`. A autenticação é simulada no navegador e **não protege dados reais**.

## Dados e Supabase

O cliente REST e a configuração do projeto ficam em `assets/supabase.js`. O app consulta o Supabase e usa dados de demonstração quando ele não está configurado ou não retorna os dados básicos esperados.

Para conectar outro projeto:

1. Configure a URL do projeto e a chave **publishable/anon** em `assets/supabase.js`.
2. Crie o schema esperado pelo app no Supabase.
3. Configure políticas RLS adequadas para as tabelas consultadas e para a tabela `resultados`.
4. Se necessário, use `assets/seed.sql` para popular um banco de teste.

**Atenção:** `seed.sql` começa apagando os dados existentes nas tabelas que popula (`TRUNCATE ... CASCADE`). Use-o somente em um banco de teste ou depois de confirmar que pode substituir esses dados.

Uma chave publishable/anon usada no navegador é pública por definição. Nunca coloque uma chave `service_role` ou outro segredo no frontend. O login atual é apenas uma seleção de perfil e não fornece autenticação real para políticas por usuário; portanto, não use dados pessoais ou acadêmicos reais com esta configuração demonstrativa.

