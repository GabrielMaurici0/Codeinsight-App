// ════════════════════════════════════════════
// 9. BASE DE CONHECIMENTO (ISSUE_KB)
// Cada entrada mapeia um ID de issue a um objeto com:
//   what    — explicação do problema (HTML permitido)
//   impact  — lista de impactos
//   bad     — código problemático (texto)
//   good    — código correto (texto)
//   badLines  — linhas a destacar em vermelho
//   goodLines — linhas a destacar em verde
// ════════════════════════════════════════════

export const ISSUE_KB = {
  // ════════════════════════════════════════════
  // LINGUAGENS GENÉRICAS (JS, TS, Py, Java, Go, PHP, C#, etc.)
  // ════════════════════════════════════════════

  SEC001: {
    what: `<b>SQL Injection</b> é uma vulnerabilidade crítica que ocorre quando inputs não sanitizados são concatenados diretamente na string da query SQL. Isso permite que um atacante manipule a consulta para ler, modificar ou destruir dados.`,
    impact: [
      "💀 Exfiltração total do banco de dados",
      "🗑️ Destruição de dados (DROP TABLE, DELETE sem WHERE)",
      "🔐 Bypass de autenticação (ex: usuario' OR '1'='1'--)",
    ],
    bad: `// VULNERÁVEL — concatenação direta\nconst query = "SELECT * FROM users WHERE id = " + req.query.id;\nawait db.execute(query);`,
    good: `// SEGURO — uso de queries parametrizadas (Prepared Statements)\nconst query = "SELECT * FROM users WHERE id = ?";\nawait db.execute(query, [req.query.id]);`,
    badLines: [
      'const query = "SELECT * FROM users WHERE id = " + req.query.id;',
    ],
    goodLines: ['const query = "SELECT * FROM users WHERE id = ?";'],
  },

  SEC002: {
    what: `<b>Cross-Site Scripting (XSS)</b> ocorre quando a aplicação injeta dados não confiáveis diretamente no DOM (ex: <code>innerHTML</code>). Isso permite a execução de scripts maliciosos no navegador do usuário.`,
    impact: [
      "🍪 Roubo de tokens de sessão e cookies",
      "🎭 Impersonação de usuário e ações não autorizadas",
    ],
    bad: `// VULNERÁVEL\ndocument.getElementById('userInfo').innerHTML = userData.name;`,
    good: `// SEGURO — usar textContent ou bibliotecas de sanitização\ndocument.getElementById('userInfo').textContent = userData.name;\n// Ou com DOMPurify:\nel.innerHTML = DOMPurify.sanitize(userData.name);`,
    badLines: [
      "document.getElementById('userInfo').innerHTML = userData.name;",
    ],
    goodLines: [
      "document.getElementById('userInfo').textContent = userData.name;",
    ],
  },

  SEC003: {
    what: `<b>Segredos hardcoded</b> referem-se a credenciais (senhas, API Keys, tokens) fixadas diretamente no código-fonte. Isso expõe a infraestrutura a vazamentos massivos via repositórios de código.`,
    impact: [
      "🔑 Acesso não autorizado a APIs de terceiros e bancos de dados",
      "📜 Exposição permanente no histórico do Git (mesmo se apagado depois)",
    ],
    bad: `const DB_PASSWORD = "super_secret_2024";\nconst STRIPE_KEY  = "sk_live_AbCdEfGhIj...";`,
    good: `// SEGURO — uso de variáveis de ambiente ou gerenciadores de segredos\nconst DB_PASSWORD = process.env.DB_PASSWORD;`,
    badLines: ['const DB_PASSWORD = "super_secret_2024";'],
    goodLines: ["const DB_PASSWORD = process.env.DB_PASSWORD;"],
  },

  SEC004: {
    what: `O uso de <b>eval()</b> ou similares converte strings dinâmicas em código executável. Se essa string contiver inputs externos, resulta em Execução Remota de Código (RCE).`,
    impact: [
      "💥 Execução de código arbitrário no servidor ou cliente",
      "🔓 Comprometimento total da máquina ou container",
    ],
    bad: `const result = eval(response.data.transform);`,
    good: `// SEGURO — fazer parse seguro ou usar mapas de funções\nconst result = JSON.parse(response.data);`,
    badLines: ["const result = eval(response.data.transform);"],
    goodLines: ["const result = JSON.parse(response.data);"],
  },

  SEC005: {
    what: `<b>Command Injection</b> ocorre ao repassar inputs do usuário diretamente para o shell do sistema operacional (ex: <code>exec</code>, <code>subprocess.call</code>).`,
    impact: [
      "💻 Controle total sobre o sistema operacional subjacente",
      "📁 Leitura de arquivos sensíveis (ex: /etc/passwd)",
    ],
    bad: `subprocess.call("run_report " + user_input, shell=True)`,
    good: `# SEGURO — passar argumentos como lista e desativar o shell\nsubprocess.run(["run_report", user_input], shell=False)`,
    badLines: ['subprocess.call("run_report " + user_input, shell=True)'],
    goodLines: ['subprocess.run(["run_report", user_input], shell=False)'],
  },

  BG001: {
    what: `Funções de debug como <b>console.log()</b> ou <b>print()</b> em ambiente de produção poluem a saída padrão e podem vazar informações sensíveis (PII).`,
    impact: [
      "📋 Dificuldade de auditoria devido a logs ruidosos",
      "🔓 Vazamento acidental de tokens ou dados de clientes nos logs",
    ],
    bad: `console.log("Dados do usuário:", user);`,
    good: `// SEGURO — uso de bibliotecas de log estruturado com níveis de severidade\nlogger.debug("Dados do usuário", { userId: user.id });`,
    badLines: ['console.log("Dados do usuário:", user);'],
    goodLines: ['logger.debug("Dados do usuário", { userId: user.id });'],
  },

  BG004: {
    what: `Tratamentos genéricos de exceção (<b>catch/except vazio</b>) engolem erros críticos silenciosamente, mascarando bugs graves da aplicação e dificultando a investigação.`,
    impact: [
      "🤫 Estado inconsistente da aplicação sem evidências do erro",
      "🔍 Perda irreparável do Stack Trace",
    ],
    bad: `try {\n  await processPayment();\n} catch (e) {\n  // Erro ignorado silenciosamente\n}`,
    good: `try {\n  await processPayment();\n} catch (error) {\n  logger.error('Falha no pagamento', { error });\n  throw new PaymentError(error);\n}`,
    badLines: ["} catch (e) {"],
    goodLines: ["logger.error('Falha no pagamento', { error });"],
  },

  SM001: {
    what: `<b>Arquivos muito longos (God Object)</b> acumulam excesso de responsabilidades, violando o princípio SRP (Single Responsibility Principle) do SOLID.`,
    impact: [
      "🧪 Dificuldade extrema na criação de testes unitários isolados",
      "👥 Conflitos frequentes de merge em equipes grandes",
    ],
    bad: `// Um único arquivo gerenciando Autenticação, Banco de Dados, \n// Envio de Email e Regras Financeiras simultaneamente.`,
    good: `// Código fragmentado em módulos de responsabilidade única:\n// - authService.ts\n// - paymentRepository.ts\n// - emailProvider.ts`,
    badLines: [],
    goodLines: [],
  },

  SM002: {
    what: `A <b>Complexidade Ciclomática</b> mede a quantidade de caminhos independentes no código. Índices altos (> 20) indicam código frágil e quase impossível de ser testado de forma abrangente.`,
    impact: [
      "🐛 Probabilidade altíssima de bugs em casos de uso periféricos (edge cases)",
      "🤯 Curva de aprendizado enorme para novos desenvolvedores",
    ],
    bad: `if (condA) {\n  if (condB) {\n    for (let x of y) { ... }\n  } else { ... }\n}`,
    good: `// SEGURO — Uso de retornos antecipados (Guard Clauses)\nif (!condA) return false;\nif (!condB) return processAlternative();\nreturn processMain(y);`,
    badLines: [],
    goodLines: ["if (!condA) return false;"],
  },

  SM005: {
    what: `<b>Código Duplicado</b> viola o princípio DRY (Don't Repeat Yourself). Clonar lógicas idênticas gera dívida técnica imediata.`,
    impact: [
      "🔧 A correção de um bug precisa ser replicada manualmente em vários locais",
      "📈 Aumento desnecessário da base de código",
    ],
    bad: `// Mesma função matemática copiada em 3 controllers diferentes`,
    good: `// Lógica extraída para um arquivo /utils/mathHelper.js e importada onde necessário`,
    badLines: [],
    goodLines: [],
  },

  QA001: {
    what: `Comentários do tipo <b>TODO / FIXME</b> representam tarefas pendentes ou dívida técnica assumida que foram esquecidas em produção.`,
    impact: [
      "📋 Acúmulo de débito técnico não documentado no Jira/Trello",
      "🗑️ Contexto perdido com a rotatividade da equipe",
    ],
    bad: `// TODO: Precisamos validar se o CPF é real antes de salvar`,
    good: `// A validação foi implementada via domain service ou\n// existe um ticket rastreável: TODO(#1234): Adicionar validação na API externa`,
    badLines: ["// TODO: Precisamos validar se o CPF é real antes de salvar"],
    goodLines: [],
  },

  // ════════════════════════════════════════════
  // GENEXUS 9 ESPECÍFICO (Prefixo GX_)
  // ════════════════════════════════════════════

  GX_PERF001: {
    what: `Um <b>FOR EACH aninhado</b> sem relação direta realiza uma consulta completa na tabela interna para cada iteração da tabela externa. Sem índices adequados, isso cria um problema N+1 clássico e severo.`,
    impact: [
      "🐢 Aumento logarítmico ou exponencial no tempo de execução do objeto",
      "📈 Sobrecarga excessiva de I/O e CPU no SGBD",
    ],
    bad: `For Each Cobranca\n  For Each Parcela // Navegação independente = nova query completa a cada cobrança\n    &total = &total + ParcValor\n  EndFor\nEndFor`,
    good: `For Each Cobranca\n  // Se Parcela pertencer à Tabela Estendida de Cobranca, \n  // o GeneXus resolve a navegação em uma única query com JOIN implícito.\n  &total = &total + ParcValor\nEndFor`,
    badLines: [
      "For Each Parcela // Navegação independente = nova query completa a cada cobrança",
    ],
    goodLines: ["// Se Parcela pertencer à Tabela Estendida de Cobranca,"],
  },

  GX_PERF003: {
    what: `<b>COMMIT por linha</b>: O uso do comando <code>Commit</code> dentro de um laço obriga o banco de dados a realizar gravações físicas no disco e fechar/reabrir o log de transações a cada iteração individual.`,
    impact: [
      "🐢 Processamentos em lote (batch) que deveriam levar segundos passam a demorar horas",
      "🔓 Quebra a atomicidade: em caso de falha, parte dos registros ficará salva e não haverá como aplicar um rollback efetivo",
    ],
    bad: `For Each Pedido\n  PedStatus = 'PROCESSADO'\n  Commit // PROBLEMA: Commit por linha processada\nEndFor`,
    good: `For Each Pedido\n  PedStatus = 'PROCESSADO'\nEndFor\nCommit // CORRETO: Único commit consolidando a transação inteira ao final`,
    badLines: ["Commit // PROBLEMA: Commit por linha processada"],
    goodLines: [
      "Commit // CORRETO: Único commit consolidando a transação inteira ao final",
    ],
  },

  GX_PERF004: {
    what: `<b>FOR EACH sem Order</b>: Quando um <code>For Each</code> não possui uma cláusula <code>Order</code> explícita, o otimizador do banco de dados decidirá a sequência de retorno. Em volumes grandes, isso acarreta em retornos não-determinísticos.`,
    impact: [
      "🎲 Resultados de relatórios variam aleatoriamente a cada execução",
      "📄 Quebra lógicas de quebra de controle (control breaks) ou sumarizações",
    ],
    bad: `For Each Cliente\n  // Navegação sem garantia de ordem\n  &nome = CliNome\nEndFor`,
    good: `For Each Cliente\n  Order CliNome // Uso explícito de um atributo indexado\n  &nome = CliNome\nEndFor`,
    badLines: ["For Each Cliente"],
    goodLines: ["Order CliNome // Uso explícito de um atributo indexado"],
  },

  GX_SEC001: {
    what: `A engine do GeneXus previne SQL Injection usando *Prepared Statements* nativamente. Porém, o uso de <b>Macro Substitution</b> (<code>Where &Variavel</code>) burla essa proteção, repassando strings inteiras e não tratadas diretamente ao SGBD.`,
    impact: [
      "💀 Permite que um usuário mal-intencionado manipule completamente a query SQL construída pelo GX",
      "🗑️ Acesso irrestrito a dados sensíveis bypassando lógicas da tabela",
    ],
    bad: `// VULNERÁVEL — Macro substitution dinâmica\n&Filtro = "CliNome = '" + &InputUsuario + "'"\nFor Each Cliente\n  Where &Filtro\nEndFor`,
    good: `// SEGURO — Condição explícita (parametrizada nativamente pelo GX)\nFor Each Cliente\n  Where CliNome = &InputUsuario\nEndFor`,
    badLines: [
      '&Filtro = "CliNome = \'" + &InputUsuario + "\'"',
      "Where &Filtro",
    ],
    goodLines: ["Where CliNome = &InputUsuario"],
  },

  GX_SEC002: {
    what: `<b>XSS em TextBlock</b>: Se a propriedade Format de um TextBlock estiver definida como HTML, a atribuição de uma variável não validada no <code>.Caption</code> permite injeção de scripts no painel web gerado.`,
    impact: [
      "🍪 Roubo de contexto da sessão web do usuário",
      "🎭 Execução de comandos maliciosos no front-end",
    ],
    bad: `TxtMensagem.Caption = &DadosDoFormulario // Vulnerável se TxtMensagem for HTML`,
    good: `TxtMensagem.Caption = HTMLEncode(&DadosDoFormulario) // Sanitiza as tags`,
    badLines: [
      "TxtMensagem.Caption = &DadosDoFormulario // Vulnerável se TxtMensagem for HTML",
    ],
    goodLines: [
      "TxtMensagem.Caption = HTMLEncode(&DadosDoFormulario) // Sanitiza as tags",
    ],
  },

  GX_PAD0001: {
    what: `A diretiva <b>NoWait</b> acoplada à função <code>Msg()</code> instrui a interface a não bloquear a thread. Consequentemente, a mensagem pisca na tela e o processamento continua, impedindo a leitura de notificações críticas.`,
    impact: [
      "⚠️ Alertas de erros de validação são ignorados sumariamente",
      "🔀 Em Procedures, chamadas com NoWait perdem o tracking de retorno síncrono",
    ],
    bad: `Msg('Saldo insuficiente para a operação.', nowait)\nReturn`,
    good: `// Remove o nowait para garantir o bloqueio da interface até o ciente dar OK\nMsg('Saldo insuficiente para a operação.')\nReturn`,
    badLines: ["Msg('Saldo insuficiente para a operação.', nowait)"],
    goodLines: ["Msg('Saldo insuficiente para a operação.')"],
  },

  GX_CONC002: {
    what: `A instrução <b>Submit()</b> dispara a execução de um objeto GeneXus em uma nova thread assíncrona. O objeto chamador não aguardará sua conclusão, causando condições de corrida caso dependa dos dados processados.`,
    impact: [
      "🔄 Race conditions com concorrência no banco de dados",
      "❓ Relatórios ou processamentos sendo emitidos antes dos cálculos terminarem",
    ],
    bad: `Submit(PRC_CalculaImpostos)\n// Risco: Relatório sendo emitido ANTES do imposto ser salvo no banco\nCall(RPT_NotaFiscal)`,
    good: `// Uso de Call() para garantir execução síncrona\nCall(PRC_CalculaImpostos)\nCall(RPT_NotaFiscal)`,
    badLines: ["Submit(PRC_CalculaImpostos)"],
    goodLines: ["Call(PRC_CalculaImpostos)"],
  },
};
