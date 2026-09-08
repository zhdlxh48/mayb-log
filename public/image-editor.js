(() => {
  const form = document.querySelector("#post-form");
  const input = document.querySelector("#image-files");
  const list = document.querySelector("#pending-images");
  const markdown = document.querySelector("#body_markdown");
  const progress = document.querySelector("#upload-progress");
  if (!form || !input || !list || !markdown || !window.imageCompression) return;
  const postUuid = document.querySelector("#image-editor").dataset.postUuid;
  const pending = new Map();
  const size = (bytes) => `${(bytes / 1024).toFixed(1)} KB`;
  const insert = (text) => {
    markdown.setRangeText(text, markdown.selectionStart, markdown.selectionEnd, "end");
    markdown.focus();
  };
  const render = () => {
    list.replaceChildren(...[...pending].map(([uuid, image]) => {
      const row = document.createElement("div"); row.className = "image-item";
      const thumbnail = new Image(); thumbnail.src = image.url; thumbnail.alt = "";
      const alt = document.createElement("input"); alt.placeholder = "Alt/설명"; alt.value = image.alt;
      alt.addEventListener("input", () => { image.alt = alt.value; });
      const info = document.createElement("span"); info.textContent = `${uuid}.webp · ${size(image.blob.size)}`;
      const insertButton = document.createElement("button"); insertButton.type = "button"; insertButton.textContent = "Insert";
      insertButton.addEventListener("click", () => insert(`![${image.alt}](/media/posts/${postUuid}/${uuid}.webp)`));
      const remove = document.createElement("button"); remove.type = "button"; remove.textContent = "X";
      remove.addEventListener("click", () => {
        const url = `/media/posts/${postUuid}/${uuid}.webp`;
        const warning = markdown.value.includes(url) ? "Markdown 링크는 남아 깨질 수 있습니다. 이미지를 목록에서 제거하시겠습니까?" : "이미지를 목록에서 제거하시겠습니까?";
        if (confirm(warning)) { URL.revokeObjectURL(image.url); pending.delete(uuid); render(); }
      });
      row.append(thumbnail, alt, info, insertButton, remove); return row;
    }));
  };
  input.addEventListener("change", async () => {
    for (const file of input.files) {
      const uuid = crypto.randomUUID();
      progress.textContent = `${file.name} 압축 중`;
      const blob = await imageCompression(file, { maxWidthOrHeight: 1600, useWebWorker: true, fileType: "image/webp", initialQuality: .82, libURL: "/vendor/browser-image-compression.js", onProgress: (value) => { progress.textContent = `${file.name} 압축 중 ${Math.round(value)}%`; } });
      pending.set(uuid, { blob, url: URL.createObjectURL(blob), alt: file.name.replace(/\.[^.]+$/, "") });
    }
    input.value = ""; progress.textContent = ""; render();
  });
  document.querySelectorAll("#existing-images .image-item").forEach((row) => {
    const uuid = row.dataset.imageUuid; const url = `/media/posts/${postUuid}/${uuid}.webp`; const used = row.querySelector("[data-used]");
    const updateUsed = () => { used.textContent = markdown.value.includes(url) ? "Used" : "Unused"; };
    updateUsed(); markdown.addEventListener("input", updateUsed);
    row.querySelector("[data-insert-image]").addEventListener("click", () => insert(`![${prompt("Alt/설명", "") || ""}](${url})`));
    row.querySelector("[data-delete-image]").addEventListener("click", (event) => {
      const deleting = row.dataset.deleted !== "true";
      if (deleting) {
        const message = markdown.value.includes(url) ? "이 이미지는 현재 Markdown에서 사용 중입니다. 삭제하면 깨진 이미지 링크가 남습니다. 계속하시겠습니까?" : "이 이미지를 삭제하시겠습니까?";
        if (!confirm(message)) return;
        const hidden = document.createElement("input"); hidden.type = "hidden"; hidden.name = "delete_image"; hidden.value = uuid; hidden.dataset.deleteFor = uuid; form.append(hidden);
      } else form.querySelector(`[data-delete-for="${uuid}"]`)?.remove();
      row.dataset.deleted = String(deleting); event.currentTarget.textContent = deleting ? "Undo" : "X";
    });
  });
  const existing = new Set([...document.querySelectorAll("[data-image-uuid]")].map((row) => row.dataset.imageUuid));
  const pattern = new RegExp(`/media/posts/${postUuid}/([0-9a-f-]{36})\\.webp`, "gi");
  const broken = [...markdown.value.matchAll(pattern)].map((match) => match[1]).filter((uuid) => !existing.has(uuid));
  if (broken.length) { const message = document.createElement("p"); message.className = "warning"; message.textContent = `R2에 없는 이미지 참조: ${[...new Set(broken)].join(", ")}`; list.before(message); }
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(form);
    for (const [uuid, image] of pending) data.append("images", image.blob, `${uuid}.webp`);
    const request = new XMLHttpRequest(); request.open("POST", form.action);
    request.upload.onprogress = ({ loaded, total }) => { if (total) progress.textContent = `Uploading ${Math.round(loaded / total * 100)}% · ${size(loaded)} / ${size(total)}`; };
    request.onload = () => { if (request.status >= 200 && request.status < 400) location.href = request.responseURL; else progress.textContent = "저장하지 못했습니다."; };
    request.onerror = () => { progress.textContent = "네트워크 오류로 저장하지 못했습니다."; };
    request.send(data);
  });
})();
