(() => {
  'use strict';
  const nativeFetch = window.fetch.bind(window);
  const marker = '\n---\n\n*Dedicated to Adriana M. K.*';

  window.fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : input?.url || '';
    const response = await nativeFetch(input, init);
    if (!response.ok || !/(?:^|\/)FigureLoom-Bio\.md(?:$|[?#])/i.test(url)) return response;

    const original = await response.text();
    try {
      const additionResponse = await nativeFetch('./FigureLoom-Bio-Interoperability.md', { cache:'no-cache' });
      if (!additionResponse.ok) return new Response(original, { status:response.status, statusText:response.statusText, headers:response.headers });
      const addition = (await additionResponse.text()).trim();
      const combined = original.includes(marker)
        ? original.replace(marker, `\n\n${addition}\n${marker}`)
        : `${original.trimEnd()}\n\n${addition}\n`;
      const headers = new Headers(response.headers);
      headers.set('content-type', 'text/plain; charset=utf-8');
      return new Response(combined, { status:response.status, statusText:response.statusText, headers });
    } catch {
      return new Response(original, { status:response.status, statusText:response.statusText, headers:response.headers });
    }
  };
})();
