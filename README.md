# BuilderLab Template

Template para o workshop **"Build Your MVP with AI"** — pessoas sem experiência técnica
constroem o MVP de uma ideia com o Claude, usando GitHub + Vercel/EAS + Supabase + Stripe.

## Como usar

1. Crie um repositório novo no GitHub a partir deste template (ou copie e cole todos os
   arquivos deste repositório para o seu).
2. Abra o projeto no Claude Code.
3. Conecte os 4 MCPs: **GitHub**, **Vercel**, **Supabase** e **Stripe** (configuração já em
   `.mcp.json` — o Claude Code vai pedir para autenticar cada um na primeira vez que forem
   usados).
4. Digite `/setup` e responda às duas perguntas (web ou mobile? qual é a ideia?). O Claude
   monta o esqueleto do projeto a partir daí.

Você não precisa entender o que está em `.claude/` para começar — essa pasta é para o
Claude, não para você. O que importa: **o Claude já sabe como se comportar neste projeto**
antes mesmo de você escrever a primeira mensagem.

## O que este template garante (sem você precisar pedir)

- **Segurança do Supabase**: toda tabela nasce com Row Level Security habilitado, sessão e
  cookies tratados corretamente, chave secreta nunca exposta no navegador/app.
- **Migrations seguras**: mudanças no banco são sempre aditivas (nunca apagam ou reescrevem o
  que já existe), então uma migration nunca quebra o que já está em produção.
- **Deploy que se autocorrige**: se o deploy na Vercel quebrar, o Claude lê os logs sozinho
  (via MCP) e corrige — você só é acionado se precisar colar uma chave que só você tem.
- **Stripe no modo certo**: chaves de teste por padrão, webhooks validados, nenhum dado de
  cartão passa pelo seu próprio código.
- **Código sempre limpo**: `oxlint` + `oxfmt` rodam sozinhos a cada edição e antes de todo
  push.
- **Nada quebra sem aviso**: todo push passa por lint, formatação, testes e uma varredura de
  segredos antes de sair da sua máquina; o GitHub Actions roda os mesmos checks em toda PR.
- **Chaves nunca vazam**: um hook bloqueia qualquer commit/push que contenha algo parecido com
  uma chave de API real.
- **Camadas de segurança da aplicação**: rate limiting em rotas públicas e limite de e-mails
  por usuário já vêm prontos (`stacks/*/lib/rate-limit.ts` e
  `supabase/migrations/00000000000001_rate_limits.sql`).

## Escolha 1: Web

Next.js (App Router) + TypeScript + shadcn/ui + TanStack Query, deploy na Vercel.
Referência de arquivos em `stacks/web/`.

## Escolha 2: Mobile

React Native + Expo + NativeWind (Tailwind), deploy via EAS.
Referência de arquivos em `stacks/mobile/`.

Backend e pagamento são sempre os mesmos nas duas opções: **Supabase** e **Stripe**.

## Estrutura da pasta `.claude/`

```
.claude/
├── CLAUDE.md              # regras gerais do projeto — leitura obrigatória para o Claude
├── settings.json          # liga os hooks de segurança/qualidade de verdade
├── commands/               # comandos de barra (/setup, /new-feature, /new-migration, ...)
├── skills/                  # guias detalhados por assunto (Supabase, migrations, Vercel,
│                            # Stripe, qualidade de código, testes, segurança de app)
├── agents/                  # subagentes especialistas (deploy, migrations, segurança)
└── hooks/                   # scripts reais que bloqueiam segredos, migrations destrutivas,
                              # e rodam lint/format/testes automaticamente
```

## Comandos disponíveis

| Comando | O que faz |
|---|---|
| `/setup` | Pergunta web ou mobile e monta o esqueleto do projeto |
| `/new-feature` | Fluxo padrão para construir uma funcionalidade do início ao fim |
| `/new-migration` | Cria uma migration nova, sempre aditiva e com RLS |
| `/fix-vercel-deploy` | Investiga e corrige um deploy quebrado |
| `/pre-push-check` | Roda manualmente a checagem completa antes de um push |
| `/security-audit` | Auditoria rápida de segurança do projeto inteiro |

## Requisitos para quem vai facilitar o workshop

- Conta GitHub, Vercel (ou Expo/EAS), Supabase e Stripe já criadas para cada participante
  (ou uma conta compartilhada, dependendo do formato do workshop).
- Claude Code instalado, com os 4 MCPs deste `.mcp.json` conectados.
- Node.js 20+ instalado (necessário para `npx create-next-app`/`create-expo-app`, `oxlint`,
  `oxfmt`, `vitest`).
