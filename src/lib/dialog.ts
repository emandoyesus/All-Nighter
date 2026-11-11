/** Keyboard focus stays in the topmost modal and returns to its opener. */
const stack: HTMLElement[] = [];
export function dialogFocus(node: HTMLElement, close: () => void) {
 const opener = document.activeElement as HTMLElement | null;
 const oldTabindex = node.getAttribute('tabindex');
 node.tabIndex = -1;
 stack.push(node);
 const items = () => [...node.querySelectorAll<HTMLElement>('button, a[href], input, select, textarea, [tabindex]')]
  .filter(el => el.tabIndex >= 0 && !el.matches(':disabled') && !el.closest('[inert]') && el.getClientRects().length);
 const top = () => stack.at(-1) === node;
 const focus = () => (items()[0] || node).focus();
 const frame = requestAnimationFrame(() => { if (top()) focus(); });
 const key = (e: KeyboardEvent) => {
  if (!top()) return;
  if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); close(); }
  if (e.key === 'Tab') {
   const list = items(); const first = list[0]; const last = list.at(-1);
   if (!first) { e.preventDefault(); node.focus(); }
   else if (e.shiftKey && (document.activeElement === first || document.activeElement === node)) {
    e.preventDefault(); last?.focus();
   } else if (!e.shiftKey && (document.activeElement === last || document.activeElement === node)) {
    e.preventDefault(); first.focus();
   }
  }
 };
 const contain = (e: FocusEvent) => { if (top() && !node.contains(e.target as Node)) focus(); };
 const click = (e: MouseEvent) => { if (top() && e.target === node) close(); };
 node.addEventListener('keydown', key);
 node.addEventListener('click', click);
 document.addEventListener('focusin', contain);
 return {
  update(next: () => void) { close = next; },
  destroy() {
   cancelAnimationFrame(frame);
   stack.splice(stack.indexOf(node), 1);
   node.removeEventListener('keydown', key);
   node.removeEventListener('click', click);
   document.removeEventListener('focusin', contain);
   if (oldTabindex === null) node.removeAttribute('tabindex'); else node.setAttribute('tabindex', oldTabindex);
   if (opener?.isConnected) opener.focus();
  }
 };
}
