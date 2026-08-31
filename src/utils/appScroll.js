const getAppScrollContainer = () => document.getElementById('root');

export const scrollAppTo = ({ top, behavior = 'auto' }) => {
  const scrollContainer = getAppScrollContainer();

  if (scrollContainer && typeof scrollContainer.scrollTo === 'function') {
    scrollContainer.scrollTo({ top: Math.max(0, top), behavior });
    return;
  }

  window.scrollTo({ top: Math.max(0, top), behavior });
};

export const scrollElementToAppTop = (element, { offset = 0, behavior = 'auto' } = {}) => {
  if (!element) return;

  const scrollContainer = getAppScrollContainer();
  if (scrollContainer && typeof scrollContainer.scrollTo === 'function') {
    const containerRect = scrollContainer.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();
    const top = scrollContainer.scrollTop + elementRect.top - containerRect.top - offset;
    scrollContainer.scrollTo({ top: Math.max(0, top), behavior });
    return;
  }

  const top = window.scrollY + element.getBoundingClientRect().top - offset;
  window.scrollTo({ top: Math.max(0, top), behavior });
};
