export async function setupManualSms(db, refreshQueue) {
  const card = document.getElementById("manualSms");
  if (!card.hidden) return;
  card.hidden = false;

  const search = document.getElementById("smsStudentSearch");
  const list = document.getElementById("smsStudents");
  const template = document.getElementById("smsManualTemplate");
  const preview = document.getElementById("smsManualPreview");
  const send = document.getElementById("smsManualSend");
  const status = document.getElementById("smsManualStatus");
  const selected = new Set();
  let students = [];
  let sending = false;

  function buildMessages() {
    const rows = [];
    const excluded = [];
    const draft = template.value.trim();
    for (const student of students.filter(({ id }) => selected.has(id))) {
      const phones = new Set();
      for (const guardian of student.guardians) {
        const phone = (guardian.phone ?? "").replace(/[^0-9]/g, "");
        if (!guardian.sms_enabled || !/^\d{10,11}$/.test(phone) || phones.has(phone)) continue;
        phones.add(phone);
        rows.push({
          attendance_id: null,
          student_id: student.id,
          guardian_id: guardian.id,
          recipient_name: guardian.name,
          recipient_phone: phone,
          message: draft.replaceAll("{학생명}", () => student.name)
        });
      }
      if (phones.size === 0) excluded.push(student.name);
    }
    return { rows, excluded };
  }

  function renderPreview() {
    const { rows, excluded } = buildMessages();
    const entries = rows.map(row => `${row.recipient_phone}\n${row.message}`);
    if (excluded.length) entries.push(`발송 가능 번호 없음 · ${excluded.join(", ")}`);
    preview.textContent = entries.join("\n\n") || "원생을 선택하면 발송 내용을 볼 수 있습니다.";
    send.disabled = sending || !template.value.trim() || rows.length === 0;
  }

  function renderStudents() {
    list.replaceChildren();
    for (const student of students.filter(({ name }) => name.includes(search.value.trim()))) {
      const label = document.createElement("label");
      label.className = "switch";
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = selected.has(student.id);
      checkbox.onchange = () => {
        if (checkbox.checked) selected.add(student.id);
        else selected.delete(student.id);
        renderPreview();
      };
      label.append(checkbox, `${student.name} · ${student.student_code ?? ""}`);
      list.append(label);
    }
  }

  search.oninput = renderStudents;
  template.oninput = renderPreview;
  send.onclick = async () => {
    const { rows } = buildMessages();
    if (send.disabled) return;
    sending = true;
    renderPreview();
    status.textContent = "";
    try {
      const today = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul" }).format(new Date());
      const { data, error } = await db.from("sms_outbox")
        .select("student_id,recipient_phone")
        .is("attendance_id", null)
        .gte("created_at", `${today}T00:00:00+09:00`)
        .in("student_id", [...new Set(rows.map(row => row.student_id))])
        .in("status", ["pending", "sending", "sent"]);
      if (error) throw error;
      const duplicate = rows.some(row => data.some(prior =>
        prior.student_id === row.student_id && prior.recipient_phone === row.recipient_phone));
      const details = rows.map(row => `${row.recipient_phone}\n${row.message}`).join("\n\n");
      const warning = duplicate ? "중복 발송 경고 · 오늘 같은 학생과 수신번호의 발송 이력이 있습니다.\n\n" : "";
      if (!window.confirm(`${warning}${rows.length}건을 Android SIM 발신기에 등록할까요?\n\n${details}`)) return;

      const result = await db.from("sms_outbox").insert(rows);
      if (result.error) throw result.error;
      status.textContent = `${rows.length}건을 발송 대기에 등록했습니다.`;
      selected.clear();
      renderStudents();
      await refreshQueue();
    } catch (error) {
      status.textContent = `처리 결과를 확인해 주세요. ${error.message}`;
    } finally {
      sending = false;
      renderPreview();
    }
  };

  status.textContent = "원생 명단을 불러오는 중입니다.";
  const { data, error } = await db.from("students")
    .select("id,name,student_code,guardians(id,name,phone,sms_enabled)")
    .order("name").order("id");
  status.textContent = error ? error.message : "";
  students = data ?? [];
  renderStudents();
  renderPreview();
}
