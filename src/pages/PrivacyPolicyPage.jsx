import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Bot,
  Cloud,
  Database,
  ExternalLink,
  LockKeyhole,
  Mail,
  MapPinned,
  ShieldCheck,
  UsersRound
} from 'lucide-react';

const POLICY_LAST_UPDATED = '2026 年 8 月 31 日';
const APP_ORIGIN = 'https://trip-planner-36455.firebaseapp.com';
const PRIVACY_CONTACT_EMAIL = import.meta.env.VITE_PRIVACY_CONTACT_EMAIL || 'trip.planner.36455@gmail.com';

const policySections = [
  ['notice', '蒐集告知'],
  ['data', '蒐集哪些資料'],
  ['storage', '資料存放位置'],
  ['sharing', '共享與第三方'],
  ['responsibility', '權利與責任歸屬'],
  ['ai', 'AI 與外部資訊'],
  ['retention', '保留、移除與刪除'],
  ['rights', '你的資料權利'],
  ['security', '安全與服務限制'],
  ['contact', '聯絡與政策更新']
];

const externalPolicies = [
  {
    label: 'Firebase 隱私與安全說明',
    href: 'https://firebase.google.com/support/privacy'
  },
  {
    label: 'Google 隱私權政策',
    href: 'https://policies.google.com/privacy?hl=zh-TW'
  },
  {
    label: 'Google Maps／Google Earth 額外服務條款',
    href: 'https://maps.google.com/help/terms_maps/'
  },
  {
    label: 'OpenAI API 資料使用說明',
    href: 'https://help.openai.com/en/articles/5722486-api-data-usage-policies'
  },
  {
    label: 'OpenStreetMap Foundation 隱私權政策',
    href: 'https://osmfoundation.org/wiki/Privacy_Policy'
  },
  {
    label: 'Open-Meteo 條款與隱私說明',
    href: 'https://open-meteo.com/en/terms'
  },
  {
    label: '中華民國個人資料保護法',
    href: 'https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=I0050021'
  }
];

const SummaryCard = ({ icon: Icon, title, children }) => (
  <article className="tp-privacy-summary-card">
    <span className="tp-privacy-icon-board" aria-hidden="true">
      <Icon size={20} />
    </span>
    <div>
      <h2>{title}</h2>
      <p>{children}</p>
    </div>
  </article>
);

const PolicySection = ({ id, number, title, children }) => (
  <section id={id} className="tp-privacy-section" aria-labelledby={`${id}-title`}>
    <div className="tp-privacy-section-heading">
      <span aria-hidden="true">{String(number).padStart(2, '0')}</span>
      <h2 id={`${id}-title`}>{title}</h2>
    </div>
    <div className="tp-privacy-section-body">{children}</div>
  </section>
);

const StorageItem = ({ title, children }) => (
  <div className="tp-privacy-storage-item">
    <dt>{title}</dt>
    <dd>{children}</dd>
  </div>
);

const PrivacyPolicyPage = () => {
  useEffect(() => {
    const previousTitle = document.title;
    const descriptionContent = 'Trip Planner 隱私權政策：資料儲存、共享權限、AI 處理、刪除方式，以及建立者、旅伴與平台的責任說明。';
    const existingDescription = document.querySelector('meta[name="description"]');
    const previousDescription = existingDescription?.getAttribute('content') || '';
    const description = existingDescription || document.createElement('meta');
    const existingCanonical = document.querySelector('link[rel="canonical"]');
    const previousCanonical = existingCanonical?.getAttribute('href') || '';
    const canonical = existingCanonical || document.createElement('link');

    document.title = '隱私權政策｜Trip Planner';
    description.setAttribute('name', 'description');
    description.setAttribute('content', descriptionContent);
    canonical.setAttribute('rel', 'canonical');
    canonical.setAttribute('href', `${APP_ORIGIN}/privacy`);

    if (!existingDescription) document.head.appendChild(description);
    if (!existingCanonical) document.head.appendChild(canonical);
    window.scrollTo({ top: 0, behavior: 'auto' });

    return () => {
      document.title = previousTitle;
      if (existingDescription) {
        description.setAttribute('content', previousDescription);
      } else {
        description.remove();
      }
      if (existingCanonical) {
        canonical.setAttribute('href', previousCanonical);
      } else {
        canonical.remove();
      }
    };
  }, []);

  return (
    <main id="main-content" tabIndex={-1} className="tp-page-shell tp-privacy-page">
      <header className="tp-privacy-topbar">
        <div className="tp-privacy-topbar-inner">
          <Link to="/" className="tp-privacy-back-link">
            <ArrowLeft size={18} aria-hidden="true" />
            <span>回到 Trip Planner</span>
          </Link>
          <span className="tp-privacy-topbar-label">
            <ShieldCheck size={17} aria-hidden="true" />
            隱私權政策
          </span>
        </div>
      </header>

      <div className="tp-privacy-container">
        <header className="tp-privacy-hero">
          <div className="tp-privacy-hero-copy">
            <p className="tp-privacy-eyebrow">PRIVACY · DATA · RESPONSIBILITY</p>
            <h1>你的旅程資料，<br />由誰保存、誰能使用。</h1>
            <p className="tp-privacy-lead">
              本政策依 Trip Planner 目前實際功能與資料結構撰寫，同時說明資料儲存、共同編輯、AI 處理，以及建立者、旅伴與平台各自承擔的責任。
            </p>
          </div>
          <div className="tp-privacy-hero-meta" aria-label="政策資訊">
            <span>最後更新</span>
            <strong>{POLICY_LAST_UPDATED}</strong>
            <a href={`${APP_ORIGIN}/privacy`}>{APP_ORIGIN}/privacy</a>
          </div>
        </header>

        <section className="tp-privacy-summary-grid" aria-label="隱私重點">
          <SummaryCard icon={Database} title="分層儲存">
            帳號與旅程主要存於 Firebase；裝置也會保留登入偏好、介面設定與旅程快取。
          </SummaryCard>
          <SummaryCard icon={UsersRound} title="依角色共享">
            建立者管理成員；編輯者可變更共同內容，檢視者只可閱讀已獲授權的旅程。
          </SummaryCard>
          <SummaryCard icon={Bot} title="AI 需主動啟用">
            只有可編輯成員主動要求推薦或手冊時，相關旅程摘要才會送往 OpenAI API。
          </SummaryCard>
        </section>

        <div className="tp-privacy-layout">
          <aside className="tp-privacy-toc" aria-label="政策目錄">
            <span>內容索引</span>
            <nav>
              {policySections.map(([id, label], index) => (
                <a key={id} href={`#${id}`}>
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  {label}
                </a>
              ))}
            </nav>
          </aside>

          <article className="tp-privacy-article">
            <PolicySection id="notice" number={1} title="蒐集告知與適用範圍">
              <p>
                本政策適用於 Trip Planner 網頁版、安裝式網頁應用程式，以及由本服務提供的登入、同步、共享、地圖、天氣、通知與 AI 功能。本政策也是服務依目前資料處理方式提供的個人資料蒐集告知。
              </p>
              <dl className="tp-privacy-notice-grid">
                <div><dt>蒐集者</dt><dd>Trip Planner 專案維護者（GitHub：ZUIHUI）</dd></div>
                <div><dt>聯絡方式</dt><dd><a href={`mailto:${PRIVACY_CONTACT_EMAIL}`}>{PRIVACY_CONTACT_EMAIL}</a></dd></div>
                <div><dt>蒐集目的</dt><dd>帳號驗證、旅程管理、共同編輯、同步、通知、地圖與天氣顯示、AI 輔助、安全防護及故障處理。</dd></div>
                <div><dt>利用期間</dt><dd>提供服務所需期間、使用者或建立者刪除／提出完整刪除申請前，以及法令、安全、備份或爭議處理所需的合理期間。</dd></div>
                <div><dt>利用地區</dt><dd>使用者所在地，以及 Google／Firebase、OpenAI、地圖、天氣、郵件和推播服務供應商設施所在國家或地區，可能包含境外處理。</dd></div>
                <div><dt>利用對象與方式</dt><dd>平台維護者、獲授權旅伴及本政策列出的處理服務商，以自動化系統、雲端服務和必要人工處理方式使用。</dd></div>
              </dl>
              <div className="tp-privacy-callout">
                <LockKeyhole size={20} aria-hidden="true" />
                <p><strong>不提供資料的影響：</strong>不提供 Email 或 Google 帳號資料將無法登入；不提供旅程內容仍可登入，但相關規劃功能無法產生結果。GPS、通知、AI 與外部地圖屬可選功能，拒絕不影響基本旅程編輯。</p>
              </div>
            </PolicySection>

            <PolicySection id="data" number={2} title="我們實際蒐集與處理的資料">
              <h3>帳號與身分資料</h3>
              <ul>
                <li>Firebase 使用者識別碼、Email、顯示名稱、頭像網址、登入供應商，以及帳號建立與更新時間。</li>
                <li>Google 登入或 Email 驗證碼登入所需的驗證資料；驗證碼以雜湊形式保存，Email 寄送與嘗試次數會留下安全紀錄。</li>
                <li>Firebase 及 Hosting 可能依其服務運作處理 IP 位址、使用者代理字串、裝置與請求資訊。</li>
              </ul>

              <h3>旅程與共同編輯資料</h3>
              <ul>
                <li>旅程名稱、日期、封面、住宿、航班、預算、每日行程、時間、地點、座標、交通、費用、網址與備註。</li>
                <li>行前清單、行李、購物項目與圖片、記帳與分帳對象、想去地點、投票、旅伴姓名及分工。</li>
                <li>建立者與成員的 UID、Email、顯示名稱、頭像、角色、邀請碼使用資訊，以及新增、修改或刪除共同內容的活動摘要。</li>
              </ul>

              <h3>裝置、即時狀態與可選資料</h3>
              <ul>
                <li>主題、介面大小、登入保存偏好、最近開啟旅程、裝置／工作階段識別碼、AI 旅伴顯示位置與旅程本機快取。</li>
                <li>開啟旅程時的在線狀態、目前分頁、正在編輯的區塊與最後活動時間，供旅伴避免同時覆寫。</li>
                <li>你主動開啟 GPS 後取得的目前座標、精度與推估地名；目前座標主要保留於頁面工作階段，不作為帳號位置歷史保存。你自行存入行程的地點與座標則屬旅程資料。</li>
                <li>你主動啟用提醒後的通知權限、推播端點、裝置金鑰、平台、顯示模式、時區、使用者代理與通知偏好。</li>
              </ul>
              <p className="tp-privacy-note">
                本服務不是保存護照、身分證、信用卡完整資料、健康紀錄或其他高度敏感資料的工具，請勿將這類資料放入行程、備註、圖片或 AI 輸入。
              </p>
            </PolicySection>

            <PolicySection id="storage" number={3} title="資料存放位置與各層用途">
              <dl className="tp-privacy-storage-list">
                <StorageItem title="你的瀏覽器">
                  使用 localStorage／sessionStorage 保存登入與介面偏好、裝置識別碼、最近旅程、旅程索引及旅程內容快取。登出不等於清除這些本機資料；你可用瀏覽器的網站資料清除功能移除。
                </StorageItem>
                <StorageItem title="Firebase Authentication">
                  保存登入帳號與驗證狀態。Firebase 官方說明指出 Authentication 於美國資料中心處理；登入持續時間依你是否選擇「記住這台裝置」而定。
                </StorageItem>
                <StorageItem title="Cloud Firestore">
                  保存帳號設定、旅程主資料與子集合、成員權限、邀請、AI 手冊、通知設定、裝置訂閱、寄送結果，以及安全與頻率限制紀錄。
                </StorageItem>
                <StorageItem title="Realtime Database">
                  保存旅伴在線、編輯位置、勾選／購買狀態與協作活動；目前專案資料庫位於 asia-southeast1 端點。
                </StorageItem>
                <StorageItem title="Cloud Storage">
                  用於保存 AI 產生的旅遊手冊封面。一般前端使用者無法直接列出或寫入 Storage；圖片由受控後端功能建立與讀取。
                </StorageItem>
                <StorageItem title="Cloud Functions、Hosting 與備份">
                  後端執行登入、邀請、通知、地點查詢與 AI 工作；Hosting 提供網頁。Google 可能依 Firebase 條款於全球基礎設施處理服務資料，並依其備份與安全週期保留副本或技術紀錄。
                </StorageItem>
              </dl>
              <p>
                目前版本沒有在前端主動初始化 Firebase Analytics 事件追蹤，也不以旅程內容投放廣告或出售個人資料；Firebase、瀏覽器與外部服務仍可能為提供服務、安全防護與防止濫用而產生各自的技術紀錄。
              </p>
            </PolicySection>

            <PolicySection id="sharing" number={4} title="共享範圍與第三方服務">
              <h3>旅伴之間的共享</h3>
              <p>
                旅程內容只向已登入且具有該旅程成員紀錄的人開放。建立者可發出邀請碼並指定「可編輯」或「唯讀」，也可停用邀請碼或移除旅伴。所有旅伴可看到共同旅程中的成員基本資料與必要協作資訊；可編輯成員的新增、修改與刪除會影響所有成員看到的共同版本。
              </p>

              <h3>提供功能所需的外部處理</h3>
              <ul>
                <li><strong>Google／Firebase：</strong>登入、資料庫、後端運算、網站託管、儲存、Google Places／Geocoding 及選用的 Google 地圖嵌入。地點關鍵字、地址或座標可能送往 Google。</li>
                <li><strong>OpenStreetMap／Nominatim：</strong>僅在部分地點解析流程作為備援；請求可能包含地點文字、座標、IP 與瀏覽器資訊。介面中的路線地圖固定使用 Google Maps。</li>
                <li><strong>Open-Meteo：</strong>提供天氣與部分地點解析；請求包含城市名稱或座標，服務商紀錄依其政策處理。</li>
                <li><strong>OpenAI API：</strong>只在你主動使用 AI 推薦或產生旅遊手冊時處理旅程摘要與你的提示。</li>
                <li><strong>郵件與推播供應商：</strong>Gmail／SMTP 用於寄送登入驗證碼；瀏覽器或作業系統的推播服務使用訂閱端點傳送你主動啟用的提醒。</li>
                <li><strong>ExchangeRate-API：</strong>更新日圓匯率時接收一般網路請求，不會由本服務刻意附帶旅程內容。</li>
              </ul>
              <p>
                外部網站、地圖、導航與供應商有自己的條款與隱私規則。當你開啟外部連結或使用嵌入內容，後續處理由該服務商負責；Trip Planner 無法控制對方的 Cookie、記錄保存或服務可用性。
              </p>
            </PolicySection>

            <PolicySection id="responsibility" number={5} title="資料權利、管理權與使用責任歸屬">
              <div className="tp-privacy-responsibility-grid">
                <article>
                  <span className="tp-privacy-icon-board" aria-hidden="true"><UsersRound size={20} /></span>
                  <h3>旅程建立者</h3>
                  <ul>
                    <li>管理旅程雲端版本、邀請碼、成員角色與一般存取權，並可移除其他旅伴或刪除旅程主紀錄。</li>
                    <li>應只邀請適當對象、定期撤銷失效邀請，並在加入他人個資前取得合法授權或同意。</li>
                    <li>應告知旅伴共同內容的用途與範圍，並在重要資料變更、匯出或刪除前與旅伴協調及自行備份。</li>
                  </ul>
                </article>
                <article>
                  <span className="tp-privacy-icon-board" aria-hidden="true"><MapPinned size={20} /></span>
                  <h3>旅伴與內容提供者</h3>
                  <ul>
                    <li>保有自己原創內容的權利，並授權 Trip Planner 在提供同步、共享、匯出與 AI 功能所需範圍內儲存、重製、轉換與傳輸。</li>
                    <li>應確保有權提供文字、圖片、姓名、聯絡資訊與其他第三人資料，不得擅自散布旅伴資料或將共同內容用於原旅程以外目的。</li>
                    <li>編輯者應理解自己的修改可能覆蓋或刪除共同資料；檢視者不得規避權限限制。</li>
                  </ul>
                </article>
                <article>
                  <span className="tp-privacy-icon-board" aria-hidden="true"><Cloud size={20} /></span>
                  <h3>Trip Planner 維護者</h3>
                  <ul>
                    <li>負責在合理範圍內維護身分驗證、存取規則、傳輸安全、服務設定，以及處理資料權利與安全事件請求。</li>
                    <li>只會在維運、除錯、安全、防止濫用、回應使用者申請或依法令要求所需範圍內，以管理權限處理資料。</li>
                    <li>不取得使用者內容的所有權，也不負責裁決旅伴之間對內容、費用或行程安排的爭議。</li>
                  </ul>
                </article>
              </div>
              <p className="tp-privacy-note">
                帳號持有人應妥善保護登入信箱、Google 帳號、裝置與邀請碼。因使用者自行公開邀請碼、共用帳號、未登出公用裝置、輸入未授權資料或將資料另行匯出而造成的揭露，應由採取該行為的人承擔相應責任；平台仍會依法處理可歸責於平台的安全與資料保護義務。
              </p>
            </PolicySection>

            <PolicySection id="ai" number={6} title="AI、地圖、天氣與自動產出限制">
              <div className="tp-privacy-callout">
                <Bot size={20} aria-hidden="true" />
                <p><strong>送出的範圍：</strong>AI 推薦可能包含旅程名稱、日期、住宿、航班、預算、既有行程、地點靈感、清單與費用摘要，以及你當次輸入的想法；旅遊手冊還可能包含購物與分帳內容。請先移除不希望交由 AI 供應商處理的個人或敏感資訊。</p>
              </div>
              <ul>
                <li>只有旅程建立者或可編輯成員可主動要求產生內容；唯讀旅伴不能觸發 AI 產生。</li>
                <li>OpenAI 官方目前說明 API 輸入與輸出預設不會用於訓練模型，除非 API 客戶明確選擇分享；供應商仍可能依其政策保留必要紀錄。</li>
                <li>AI 建議與生成圖片可能不正確、過時、遺漏或與現場情況不符，不構成旅遊、交通、財務、醫療、安全或法律保證。</li>
                <li>天氣、匯率、地圖、路線、營業資訊與航班資料都可能延遲或失準；使用者應以航空公司、交通機關、店家及政府公告等第一手來源再次確認。</li>
              </ul>
            </PolicySection>

            <PolicySection id="retention" number={7} title="保留、移除旅伴與刪除的實際效果">
              <h3>一般保留</h3>
              <ul>
                <li>帳號與個人設定會保留至帳號刪除申請完成，或服務依法停止處理為止。</li>
                <li>旅程資料原則上保留至建立者刪除旅程或提出完整刪除申請；停用的邀請、推播裝置、通知寄送、安全頻率限制與登入驗證紀錄可能繼續保留，以防止濫用、除錯或處理爭議。</li>
                <li>Email 驗證碼有效期為 10 分鐘，但相關驗證與安全紀錄不保證在 10 分鐘後立即自底層資料庫刪除。</li>
                <li>Firebase、Google、OpenAI、地圖、天氣、郵件與推播供應商的技術紀錄和備份，依各自政策與法令期間處理。</li>
              </ul>

              <h3>移除旅伴</h3>
              <p>
                建立者移除旅伴後，該成員的 Firestore 成員紀錄會刪除，一般介面存取與後續即時同步會停止。該成員先前建立的共同內容、活動摘要或必要署名不會因此自動刪除；對方在移除前已下載、截圖、列印或另行保存的副本，也不受平台控制。
              </p>

              <h3>刪除旅程與完整清除</h3>
              <p>
                目前介面的「刪除旅程」會刪除旅程主紀錄、移除本裝置對應的旅程快取，並使成員失去一般存取入口。因旅程資料分散於 Firestore 子集合、Realtime Database、通知紀錄、AI 手冊／圖片與供應商備份，此操作不代表所有底層副本在同一時間永久抹除。
              </p>
              <p>
                若要申請完整刪除帳號或可識別資料，請寄信至 <a href={`mailto:${PRIVACY_CONTACT_EMAIL}`}>{PRIVACY_CONTACT_EMAIL}</a>，註明登入 Email、旅程識別資訊與申請範圍。維護者會先驗證身分，再依可行性、其他旅伴權利、法令與服務商備份週期處理。
              </p>
            </PolicySection>

            <PolicySection id="rights" number={8} title="你可以行使的資料權利">
              <p>依適用法令，你可以就自己的個人資料請求：</p>
              <ol>
                <li>查詢、閱覽或取得複製本。</li>
                <li>補充或更正不正確資料。</li>
                <li>停止蒐集、處理或利用。</li>
                <li>刪除帳號或可識別資料。</li>
              </ol>
              <p>
                你可直接在服務內修改暱稱、旅程內容、成員與通知設定；其他請求請寄至 <a href={`mailto:${PRIVACY_CONTACT_EMAIL}`}>{PRIVACY_CONTACT_EMAIL}</a>。為避免冒用，申請時可能要求驗證帳號控制權。若資料同時屬於共同旅程、涉及其他人的權利、依法應保存或技術備份尚在輪替，處理範圍或完成時間可能受到合理限制，維護者會說明原因。
              </p>
            </PolicySection>

            <PolicySection id="security" number={9} title="安全措施、可用性與責任限制">
              <ul>
                <li>服務使用 Firebase Authentication、Firestore／Realtime Database 安全規則、HTTPS、受控 Cloud Functions 及最小化的前端 Storage 權限，限制未授權存取。</li>
                <li>Firebase 官方說明相關服務會對傳輸中資料加密，並對 Firestore、Authentication、Functions、Realtime Database 與 Storage 等服務提供靜態加密。</li>
                <li>網際網路與雲端服務無法保證絕對安全或永久不中斷。維護者會在合理範圍內修復問題，但不保證資料永不遺失、第三方服務永遠可用或所有裝置快取都能遠端清除。</li>
                <li>本服務不以未成年人為主要對象；未成年人應在法定代理人同意與協助下使用，且不得自行提供他人的敏感資料。</li>
              </ul>
            </PolicySection>

            <PolicySection id="contact" number={10} title="聯絡方式、第三方政策與更新">
              <div className="tp-privacy-contact-card">
                <span className="tp-privacy-icon-board" aria-hidden="true"><Mail size={20} /></span>
                <div>
                  <h3>隱私與資料申請</h3>
                  <p>請說明你的登入 Email、問題或申請範圍；不要在信件中附上密碼或完整身分證件。</p>
                  <a href={`mailto:${PRIVACY_CONTACT_EMAIL}`}>{PRIVACY_CONTACT_EMAIL}</a>
                </div>
              </div>

              <h3>相關官方政策</h3>
              <ul className="tp-privacy-external-links">
                {externalPolicies.map((item) => (
                  <li key={item.href}>
                    <a href={item.href} target="_blank" rel="noreferrer">
                      {item.label}
                      <ExternalLink size={14} aria-hidden="true" />
                    </a>
                  </li>
                ))}
              </ul>
              <p>
                當資料類型、外部服務、共享權限或刪除方式有重大變更時，本政策會同步更新日期與內容。重大變更如會實質影響你的權利，將以網站內適當方式另行提示。
              </p>
            </PolicySection>
          </article>
        </div>

        <footer className="tp-privacy-footer">
          <span>Trip Planner</span>
          <p>把旅程排清楚，也把資料責任說清楚。</p>
          <Link to="/">回到旅程</Link>
        </footer>
      </div>
    </main>
  );
};

export default PrivacyPolicyPage;
