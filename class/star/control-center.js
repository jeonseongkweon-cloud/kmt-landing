(()=>{
  const menu=document.getElementById("systemMenu");
  const dialog=document.getElementById("controlCenterDialog");
  const frame=document.getElementById("controlCenterFrame");
  const title=document.getElementById("controlCenterToolTitle");
  const close=document.getElementById("controlCenterClose");
  if(!menu||!dialog||!frame||!title||!close)return;

  const labels={timer:"타이머",plan:"수업계획",mission:"오늘의 미션",game:"게임",audio:"음악",video:"영상"};
  let pendingTool="plan";

  function selectExistingTool(){
    try{
      const button=frame.contentDocument?.querySelector(`.tabs button[data-tab="${pendingTool}"]`);
      if(button)button.click();
    }catch(error){console.warn("[CONTROL CENTER] 기존 수업 도구 선택 실패",error)}
  }

  function openTool(tool,mode){
    pendingTool=tool;
    title.textContent=labels[mode||tool]||"수업 도구";
    menu.hidden=true;
    document.getElementById("systemMenuButton")?.setAttribute("aria-expanded","false");
    if(!frame.hasAttribute("src")){frame.src="../tools/";frame.addEventListener("load",selectExistingTool)}
    else selectExistingTool();
    if(!dialog.open)dialog.showModal();
  }

  menu.querySelectorAll("[data-control-tool]").forEach(button=>{
    button.addEventListener("click",()=>openTool(button.dataset.controlTool,button.dataset.controlMode));
  });
  close.addEventListener("click",()=>{
    try{frame.contentDocument?.querySelector("#videoPlayer")?.pause()}catch(error){console.warn("[CONTROL CENTER] 영상 정지 실패",error)}
    dialog.close();
  });
  dialog.addEventListener("cancel",event=>{event.preventDefault();close.click()});
})();
