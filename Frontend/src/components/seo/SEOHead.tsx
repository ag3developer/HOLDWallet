import { Helmet } from 'react-helmet-async'
import { useTranslation } from 'react-i18next'

interface SEOHeadProps {
  title?: string
  description?: string
  keywords?: string
  path?: string
  image?: string
  type?: string
  noindex?: boolean
}

const SITE_URL = 'https://wolknow.com'
const DEFAULT_IMAGE = `${SITE_URL}/images/logos/wn-icon.png`

const LANG_MAP: Record<string, string> = {
  'pt-BR': 'pt_BR',
  'en-US': 'en_US',
  'es-ES': 'es_ES',
  'zh-CN': 'zh_CN',
  'ja-JP': 'ja_JP',
  'ko-KR': 'ko_KR',
}

const ALL_LANGS = ['pt-BR', 'en-US', 'es-ES', 'zh-CN', 'ja-JP', 'ko-KR']

export function SEOHead({
  title,
  description,
  keywords,
  path = '',
  image,
  type = 'website',
  noindex = false,
}: Readonly<SEOHeadProps>) {
  const { t, i18n } = useTranslation()

  const currentLang = i18n.language || 'pt-BR'
  const pageTitle = title || t('seo.defaultTitle', 'WOLK NOW® - Smart & Secure P2P Wallet')
  const pageDescription =
    description ||
    t(
      'seo.defaultDescription',
      'Trade Bitcoin, Ethereum & crypto securely with AI-Powered P2P trading, reputation system & multi-currency support.'
    )
  const pageKeywords =
    keywords ||
    t(
      'seo.defaultKeywords',
      'wolk now, smart wallet, crypto wallet, P2P trading, bitcoin, ethereum, digital wallet'
    )
  const pageUrl = `${SITE_URL}${path}`
  const pageImage = image || DEFAULT_IMAGE
  const ogLocale = LANG_MAP[currentLang] || 'pt_BR'

  return (
    <Helmet>
      {/* Basic Meta */}
      <title>{pageTitle}</title>
      <html lang={currentLang} />
      <meta name='description' content={pageDescription} />
      <meta name='keywords' content={pageKeywords} />
      {noindex ? (
        <meta name='robots' content='noindex, nofollow' />
      ) : (
        <meta name='robots' content='index, follow, max-image-preview:large' />
      )}

      {/* Canonical */}
      <link rel='canonical' href={pageUrl} />

      {/* Hreflang */}
      {ALL_LANGS.map(lang => (
        <link
          key={lang}
          rel='alternate'
          hrefLang={lang}
          href={`${pageUrl}${pageUrl.includes('?') ? '&' : '?'}lang=${lang}`}
        />
      ))}
      <link rel='alternate' hrefLang='x-default' href={pageUrl} />

      {/* Open Graph */}
      <meta property='og:title' content={pageTitle} />
      <meta property='og:description' content={pageDescription} />
      <meta property='og:type' content={type} />
      <meta property='og:url' content={pageUrl} />
      <meta property='og:image' content={pageImage} />
      <meta property='og:image:alt' content={`${pageTitle} - WOLK NOW®`} />
      <meta property='og:site_name' content='WOLK NOW®' />
      <meta property='og:locale' content={ogLocale} />
      {ALL_LANGS.filter(l => l !== currentLang).map(lang => (
        <meta key={lang} property='og:locale:alternate' content={LANG_MAP[lang] || lang} />
      ))}

      {/* Twitter */}
      <meta name='twitter:card' content='summary_large_image' />
      <meta name='twitter:title' content={pageTitle} />
      <meta name='twitter:description' content={pageDescription} />
      <meta name='twitter:image' content={pageImage} />
      <meta name='twitter:image:alt' content={`${pageTitle} - WOLK NOW®`} />
    </Helmet>
  )
}

export default SEOHead
