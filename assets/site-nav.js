(function(){
  "use strict";
  const script=document.currentScript;
  if(!script||document.querySelector(".kmt-site-header")) return;
  const siteRoot=new URL("../",script.src);
  const asset=(path)=>new URL(path,siteRoot).href;
  const css=document.createElement("link");
  css.rel="stylesheet";css.href=new URL("site-nav.css",script.src).href;document.head.appendChild(css);

  const groups=[
    {title:"도장소개",desc:"계명태권도의 교육 방향과 지도자를 소개합니다.",links:[["처음 오신 학부모 안내","first/"],["지도자 소개","coach/"],["자주 묻는 질문","#faq"]]},
    {title:"교육·프로그램",desc:"아이의 연령과 성장 단계에 맞는 수련을 확인하세요.",links:[["프로그램 전체","program/"],["유치부 프로그램","program/kids/"],["초등부 프로그램","program/elementary/"],["성장관리 프로그램","program/growth/"],["DOUBLE CROSS","program/doublecross/"]]},
    {title:"수련안내",desc:"수련 시간과 월간 계획, 심사 절차를 안내합니다.",links:[["수련시간표","schedule/"],["이번 달 수련계획","plan/"],["승급·승단심사 안내","exam/"]]},
    {title:"우리아이 성장",desc:"아이의 수련 기록과 성장 과정을 확인하세요.",links:[["수련생 조회","verification/"],["성장 포인트 조회","growth/"],["포인트 항목","growth/items/"],["성장 랭킹","growth/rank/"],["운영 안내","growth/guide/"],["갤러리·영상","gallery/"]]},
    {title:"소식·미디어",desc:"계명태권도의 최근 소식과 생생한 모습을 전합니다.",links:[["공지사항","notice/"],["갤러리·영상","gallery/"],["공식 유튜브","https://www.youtube.com/@%EA%B3%84%EB%AA%85%ED%83%9C%EA%B6%8C%EB%8F%84%EC%9A%B8%EC%82%B0",true]]},
    {title:"학부모 서비스",desc:"상담부터 조회와 결제 안내까지 빠르게 연결합니다.",links:[["카카오 상담","https://open.kakao.com/o/gF8p81hi",true],["전화 상담","tel:01044772772",true],["학부모 밴드","https://band.us/n/a8a7b9Xahdgb8",true],["수련생 조회","verification/"],["결제 안내","pay/"]]}
  ];
  const url=(link)=>link[2]?link[1]:(link[1].startsWith("#")?asset(link[1]):asset(link[1]));
  const linkHtml=(link)=>`<a class="kmt-mega-link" href="${url(link)}"${link[2]&&!link[1].startsWith("tel:")?' target="_blank" rel="noopener"':''}>${link[0]}<span aria-hidden="true" style="margin-left:auto">→</span></a>`;
  const header=document.createElement("header");header.className="kmt-site-header";
  header.innerHTML=`<div class="kmt-nav-shell"><a class="kmt-nav-brand" href="${asset("")}" aria-label="계명태권도 홈"><img src="${asset("assets/icons/192로고.png")}" alt=""><span class="kmt-nav-brand-text"><strong>계명태권도</strong><span>바른 마음 · 건강한 성장</span></span></a><nav class="kmt-nav-primary" aria-label="주요 메뉴">${groups.map((g,i)=>`<div class="kmt-nav-group"><button class="kmt-nav-trigger" type="button" data-menu="${i}" aria-expanded="false">${g.title}</button></div>`).join("")}</nav><button class="kmt-all-trigger" type="button" data-menu="all" aria-expanded="false">☰<span>전체메뉴</span></button></div><div class="kmt-mega" aria-live="polite"><div class="kmt-mega-inner"></div></div>`;
  const backdrop=document.createElement("div");backdrop.className="kmt-menu-backdrop";
  document.body.prepend(backdrop);document.body.prepend(header);
  const mega=header.querySelector(".kmt-mega"),inner=header.querySelector(".kmt-mega-inner"),buttons=[...header.querySelectorAll("[data-menu]")];
  function content(key){if(key==="all")return `<div class="kmt-mega-heading"><strong>전체메뉴</strong><span>원하시는 메뉴를 한눈에 찾아보세요.</span></div><div class="kmt-all-grid">${groups.map(g=>`<section class="kmt-all-section"><h3>${g.title}</h3><div>${g.links.map(l=>`<a href="${url(l)}"${l[2]&&!l[1].startsWith("tel:")?' target="_blank" rel="noopener"':''}>${l[0]}</a>`).join("")}</div></section>`).join("")}</div>`;const g=groups[Number(key)];return `<div class="kmt-mega-heading"><strong>${g.title}</strong><span>${g.desc}</span></div><div class="kmt-mega-links">${g.links.map(linkHtml).join("")}</div>`}
  function close(){mega.classList.remove("is-open");backdrop.classList.remove("is-open");document.body.classList.remove("kmt-menu-open");buttons.forEach(b=>b.setAttribute("aria-expanded","false"))}
  function open(btn){const key=btn.dataset.menu;if(btn.getAttribute("aria-expanded")==="true"){close();return}inner.innerHTML=content(key);buttons.forEach(b=>b.setAttribute("aria-expanded",String(b===btn)));mega.classList.add("is-open");backdrop.classList.add("is-open");document.body.classList.add("kmt-menu-open")}
  buttons.forEach(btn=>btn.addEventListener("click",()=>open(btn)));backdrop.addEventListener("click",close);document.addEventListener("keydown",e=>{if(e.key==="Escape")close()});mega.addEventListener("click",e=>{if(e.target.closest("a"))close()});
})();
