export function pdfViewerHtml(base64: string) {
  const data = JSON.stringify(base64);
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
  <style>
    html, body { margin: 0; padding: 0; background: #f3f6f8; }
    canvas { display: block; width: 100%; }
  </style>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
</head>
<body>
  <div id="viewer"></div>
  <script>
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
    const bytes = Uint8Array.from(atob(${data}), function (c) { return c.charCodeAt(0); });
    pdfjsLib.getDocument({ data: bytes }).promise.then(function (pdf) {
      var root = document.getElementById("viewer");
      function draw(n) {
        return pdf.getPage(n).then(function (page) {
          var viewport = page.getViewport({ scale: 1.35 });
          var canvas = document.createElement("canvas");
          var context = canvas.getContext("2d");
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          root.appendChild(canvas);
          return page.render({ canvasContext: context, viewport: viewport }).promise;
        });
      }
      var chain = Promise.resolve();
      for (var i = 1; i <= pdf.numPages; i++) {
        (function (n) { chain = chain.then(function () { return draw(n); }); })(i);
      }
    }).catch(function () {
      document.body.innerHTML = "<p style='padding:16px;font-family:sans-serif;color:#1B2830'>Could not open this PDF.</p>";
    });
  </script>
</body>
</html>`;
}
