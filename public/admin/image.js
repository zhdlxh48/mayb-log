(() => {
  const form = document.querySelector("#image-form");
  const input = document.querySelector("#image-file");
  const status = document.querySelector("#image-status");
  const snippet = document.querySelector("#image-snippet");
  if (!form || !window.imageCompression) return;

  const dimensions = (file) =>
    new Promise((resolve, reject) => {
      const image = new Image();
      const url = URL.createObjectURL(file);
      image.onload = () => {
        resolve(`${image.naturalWidth}×${image.naturalHeight}`);
        URL.revokeObjectURL(url);
      };
      image.onerror = reject;
      image.src = url;
    });
  const size = (bytes) => `${(bytes / 1024).toFixed(1)} KB`;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const original = input.files?.[0];
    if (!original) return;
    try {
      status.textContent = `원본 ${await dimensions(original)}, ${size(original.size)} · 압축 중 0%`;
      const compressed = await imageCompression(original, {
        maxWidthOrHeight: 1600,
        useWebWorker: true,
        fileType: "image/webp",
        initialQuality: 0.82,
        libURL: "/vendor/browser-image-compression.js",
        onProgress: (progress) => {
          status.textContent = `원본 ${size(original.size)} · 압축 중 ${Math.round(progress)}%`;
        },
      });
      status.textContent = `원본 ${await dimensions(original)}, ${size(original.size)} → 결과 ${await dimensions(compressed)}, ${size(compressed.size)} · 업로드 중`;
      const data = new FormData(form);
      data.set(
        "image",
        compressed,
        compressed.name.replace(/\.[^.]+$/, "") + ".webp",
      );
      const response = await fetch("/admin/images", {
        method: "POST",
        body: data,
      });
      const document = new DOMParser().parseFromString(
        await response.text(),
        "text/html",
      );
      if (!response.ok)
        throw new Error(
          document.body.textContent.trim() || "업로드하지 못했습니다.",
        );
      snippet.value = document.querySelector("code")?.textContent || "";
      status.textContent += " · 완료";
    } catch (error) {
      status.textContent = error.message || "이미지를 처리하지 못했습니다.";
    }
  });
})();
