/**
 * WolkPay Gateway - Termos de Uso, Política de Privacidade e Política de Cookies
 *
 * Conteúdo redigido a partir do funcionamento real do gateway (dados coletados,
 * armazenamento no navegador, Google Analytics/Tag Manager, Banco do Brasil).
 * ⚠️ Revisar com o jurídico antes de considerar versão final.
 */

import { useEffect, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Zap } from 'lucide-react'

export type LegalDoc = 'terms' | 'privacy' | 'cookies'

const COMPANY = 'HOLD DIGITAL ASSETS'
const CNPJ = '24.275.355/0001-51'
const CONTACT = 'suporte@wolknow.com'
const UPDATED_AT = '6 de novembro de 2026'

const TITLES: Record<LegalDoc, string> = {
  terms: 'Termos de Uso',
  privacy: 'Política de Privacidade',
  cookies: 'Política de Cookies',
}

function H2({ children }: { children: ReactNode }) {
  return <h2 className='mt-10 mb-3 text-xl font-semibold text-slate-900 dark:text-white'>{children}</h2>
}

function Terms() {
  return (
    <>
      <p>
        Estes Termos regulam o uso do <strong>WolkPay Gateway</strong> (“Gateway”), serviço de processamento de
        pagamentos via Pix e criptomoedas operado por {COMPANY}, CNPJ {CNPJ} (“nós”). Ao criar uma conta de
        lojista ou usar a API, você (“Lojista”) concorda com estes Termos.
      </p>

      <H2>1. O serviço</H2>
      <p>
        O Gateway permite ao Lojista criar cobranças Pix (emitidas por meio do Banco do Brasil) e cobranças em
        criptomoedas, oferecer um checkout hospedado e receber notificações (webhooks) sobre o andamento dos
        pagamentos. As funcionalidades, taxas e limites vigentes estão descritos na{' '}
        <Link to='/docs' className='text-indigo-600 hover:underline dark:text-indigo-400'>
          documentação
        </Link>
        .
      </p>

      <H2>2. Cadastro e aprovação</H2>
      <ul className='list-disc space-y-1.5 pl-5'>
        <li>O Lojista deve fornecer dados verdadeiros, completos e atualizados da empresa e do responsável.</li>
        <li>
          A conta só processa pagamentos após análise e aprovação. Podemos solicitar documentos adicionais e
          recusar, suspender ou bloquear contas em caso de inconsistência, risco ou violação destes Termos.
        </li>
      </ul>

      <H2>3. Credenciais e segurança</H2>
      <ul className='list-disc space-y-1.5 pl-5'>
        <li>
          API keys e o segredo de webhook são pessoais e intransferíveis. O Lojista é responsável por mantê-los em
          sigilo e por todas as operações feitas com eles.
        </li>
        <li>Em caso de suspeita de vazamento, o Lojista deve revogar a chave imediatamente no painel.</li>
        <li>
          O Lojista deve validar a assinatura dos webhooks e liberar pedidos somente após a confirmação do
          pagamento.
        </li>
      </ul>

      <H2>4. Taxas, liquidação e limites</H2>
      <ul className='list-disc space-y-1.5 pl-5'>
        <li>
          Cobramos uma taxa percentual por transação aprovada, descontada do valor recebido. As taxas padrão são
          publicadas no site e podem ser negociadas em contrato.
        </li>
        <li>
          Valores mínimos, máximos e limites diários se aplicam a cada pagamento e podem ser ajustados por
          lojista.
        </li>
        <li>
          A liquidação é feita na moeda escolhida pelo Lojista nas configurações da conta, conforme as opções
          disponíveis.
        </li>
        <li>Alterações nas taxas padrão serão comunicadas com antecedência razoável.</li>
      </ul>

      <H2>5. Uso proibido</H2>
      <p>
        É proibido usar o Gateway para atividades ilícitas, fraude, lavagem de dinheiro, financiamento ao
        terrorismo, venda de bens ou serviços proibidos por lei, ou para burlar controles de prevenção à fraude.
        Podemos reter valores, cancelar pagamentos e comunicar autoridades quando exigido por lei.
      </p>

      <H2>6. Estornos e contestações</H2>
      <p>
        O Lojista é responsável pelo relacionamento com seus clientes, inclusive trocas, devoluções e
        contestações. Estornos podem ser processados conforme as regras do meio de pagamento utilizado.
      </p>

      <H2>7. Disponibilidade</H2>
      <p>
        Empregamos esforços razoáveis para manter o serviço disponível, mas ele depende de terceiros (como o
        Banco do Brasil e redes blockchain) e pode sofrer interrupções. Quando um meio de pagamento estiver
        indisponível, a API informa o erro para que o Lojista possa tentar novamente ou oferecer alternativa.
      </p>

      <H2>8. Responsabilidade</H2>
      <p>
        Não nos responsabilizamos por perdas decorrentes de uso indevido das credenciais do Lojista, de
        integrações que não sigam a documentação, ou de falhas de terceiros fora do nosso controle, nos limites
        permitidos pela legislação.
      </p>

      <H2>9. Encerramento</H2>
      <p>
        O Lojista pode encerrar a conta a qualquer momento. Valores pendentes serão liquidados após a conclusão
        das transações em andamento e das verificações aplicáveis.
      </p>

      <H2>10. Dados pessoais</H2>
      <p>
        O tratamento de dados pessoais segue a nossa{' '}
        <Link to='/privacy' className='text-indigo-600 hover:underline dark:text-indigo-400'>
          Política de Privacidade
        </Link>
        .
      </p>

      <H2>11. Alterações e foro</H2>
      <p>
        Podemos atualizar estes Termos; a versão vigente fica sempre nesta página. Estes Termos são regidos pelas
        leis brasileiras.
      </p>
    </>
  )
}

function Privacy() {
  return (
    <>
      <p>
        Esta Política explica como {COMPANY}, CNPJ {CNPJ}, trata dados pessoais no <strong>WolkPay Gateway</strong>,
        em conformidade com a Lei Geral de Proteção de Dados (Lei 13.709/2018 – LGPD).
      </p>

      <H2>1. Dados que coletamos</H2>
      <ul className='list-disc space-y-1.5 pl-5'>
        <li>
          <strong>Lojistas:</strong> razão social, nome fantasia, CNPJ, e-mail, telefone, site, endereço, dados do
          responsável legal, dados bancários/carteira para liquidação e registros de acesso ao painel.
        </li>
        <li>
          <strong>Clientes dos lojistas (pagadores):</strong> os dados que o lojista envia ao criar o pagamento
          (como nome, e-mail, telefone e CPF/CNPJ) e os dados do pagamento recebidos do banco (como nome e
          CPF/CNPJ do pagador e identificador da transação Pix) ou da blockchain (endereço e hash da transação).
        </li>
        <li>
          <strong>Dados técnicos:</strong> endereço IP, navegador e registros de uso da API, para segurança e
          prevenção à fraude.
        </li>
      </ul>

      <H2>2. Para que usamos</H2>
      <ul className='list-disc space-y-1.5 pl-5'>
        <li>Processar pagamentos, confirmar recebimentos e liquidar valores (execução de contrato).</li>
        <li>Prevenir fraudes, lavagem de dinheiro e garantir a segurança da plataforma (obrigação legal e legítimo interesse).</li>
        <li>Cumprir obrigações legais, regulatórias e fiscais.</li>
        <li>Prestar suporte e comunicar informações sobre o serviço.</li>
        <li>Medir o uso do site para melhorá-lo, conforme a Política de Cookies.</li>
      </ul>

      <H2>3. Compartilhamento</H2>
      <p>Compartilhamos dados apenas quando necessário para prestar o serviço ou cumprir a lei, com:</p>
      <ul className='list-disc space-y-1.5 pl-5'>
        <li>o Banco do Brasil, para emissão e confirmação de cobranças Pix;</li>
        <li>o próprio lojista, em relação aos pagamentos feitos a ele;</li>
        <li>provedores de infraestrutura e hospedagem que operam a plataforma;</li>
        <li>autoridades públicas, quando houver obrigação legal ou ordem judicial.</li>
      </ul>
      <p>Não vendemos dados pessoais.</p>

      <H2>4. Armazenamento e segurança</H2>
      <p>
        Adotamos medidas técnicas e organizacionais como criptografia em trânsito (HTTPS/mTLS), armazenamento de
        API keys apenas em formato de hash, assinatura de webhooks e controle de acesso. Mantemos os dados pelo
        tempo necessário para as finalidades acima e pelos prazos exigidos em lei.
      </p>

      <H2>5. Seus direitos</H2>
      <p>
        Você pode solicitar confirmação de tratamento, acesso, correção, anonimização, portabilidade, eliminação
        (quando cabível), informação sobre compartilhamentos e revisão de consentimentos. Pagadores devem, de
        preferência, contatar primeiro o lojista com quem fizeram a compra, que é o controlador dos dados que
        nos envia.
      </p>

      <H2>6. Contato</H2>
      <p>
        Solicitações sobre dados pessoais:{' '}
        <a href={`mailto:${CONTACT}`} className='text-indigo-600 hover:underline dark:text-indigo-400'>
          {CONTACT}
        </a>
        .
      </p>
    </>
  )
}

function Cookies() {
  return (
    <>
      <p>
        Esta Política descreve os cookies e tecnologias de armazenamento usados no site do{' '}
        <strong>WolkPay Gateway</strong>.
      </p>

      <H2>1. Essenciais</H2>
      <p>Necessários para o funcionamento do site e não podem ser desativados:</p>
      <ul className='list-disc space-y-1.5 pl-5'>
        <li>
          <strong>Sessão:</strong> token de autenticação guardado no armazenamento local do navegador
          (localStorage/IndexedDB) para manter você conectado ao painel.
        </li>
        <li>
          <strong>Preferências:</strong> tema (claro/escuro) e idioma escolhidos.
        </li>
      </ul>

      <H2>2. Análise</H2>
      <p>
        Usamos o <strong>Google Analytics</strong> e o <strong>Google Tag Manager</strong> para entender como o site
        é usado (páginas visitadas, origem do acesso, dispositivo). Eles podem definir cookies como <code>_ga</code>{' '}
        e <code>_ga_*</code>. Os dados são agregados e usados para melhorar o site.
      </p>

      <H2>3. Como gerenciar</H2>
      <p>
        Você pode bloquear ou apagar cookies nas configurações do navegador. Bloquear o armazenamento essencial
        impede o login no painel. Para não ser medido pelo Google Analytics, use o complemento oficial de
        desativação do Google Analytics.
      </p>

      <H2>4. Contato</H2>
      <p>
        Dúvidas:{' '}
        <a href={`mailto:${CONTACT}`} className='text-indigo-600 hover:underline dark:text-indigo-400'>
          {CONTACT}
        </a>
        .
      </p>
    </>
  )
}

export default function GatewayLegalPage({ doc }: { doc: LegalDoc }) {
  useEffect(() => {
    document.title = `${TITLES[doc]} · WolkPay Gateway`
    window.scrollTo(0, 0)
  }, [doc])

  return (
    <div className='min-h-screen bg-slate-50 dark:bg-slate-900'>
      <header className='sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90'>
        <div className='mx-auto flex h-16 max-w-4xl items-center justify-between px-4 sm:px-6'>
          <Link to='/' className='flex items-center gap-2'>
            <span className='flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600'>
              <Zap className='h-5 w-5 text-white' />
            </span>
            <span className='text-lg font-bold text-slate-900 dark:text-white'>WolkPay</span>
          </Link>
          <nav className='flex gap-4 text-sm'>
            {(Object.keys(TITLES) as LegalDoc[]).map(key => (
              <Link
                key={key}
                to={`/${key}`}
                className={
                  key === doc
                    ? 'font-medium text-indigo-600 dark:text-indigo-400'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }
              >
                <span className='hidden sm:inline'>{TITLES[key]}</span>
                <span className='sm:hidden'>{TITLES[key].split(' ').pop()}</span>
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <main className='mx-auto max-w-3xl px-4 py-10 sm:px-6'>
        <Link
          to='/'
          className='mb-6 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
        >
          <ArrowLeft className='h-4 w-4' />
          Voltar
        </Link>
        <h1 className='text-3xl font-bold tracking-tight text-slate-900 dark:text-white'>{TITLES[doc]}</h1>
        <p className='mt-2 text-sm text-slate-500 dark:text-slate-400'>Última atualização: {UPDATED_AT}</p>
        <article className='mt-8 space-y-4 text-[15px] leading-relaxed text-slate-600 dark:text-slate-300'>
          {doc === 'terms' && <Terms />}
          {doc === 'privacy' && <Privacy />}
          {doc === 'cookies' && <Cookies />}
        </article>
      </main>
    </div>
  )
}
