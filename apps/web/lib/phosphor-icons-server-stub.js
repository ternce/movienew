// Server-side stub for @phosphor-icons/react
// Returns an SVG with dangerouslySetInnerHTML to prevent React from comparing
// children during hydration, avoiding React error #418.
'use strict';

const React = require('react');

const handler = {
  get(_, name) {
    if (name === '__esModule') return true;
    if (name === 'default') return new Proxy({}, handler);
    // Return a component that renders an SVG matching Phosphor's structure.
    // dangerouslySetInnerHTML prevents React from diffing children during hydration.
    const component = React.forwardRef(function PhosphorIconStub(props, ref) {
      const { className, style, width, height, size, weight, mirrored, color, children, ...rest } = props || {};
      return React.createElement('svg', {
        ref,
        xmlns: 'http://www.w3.org/2000/svg',
        viewBox: '0 0 256 256',
        fill: 'currentColor',
        className,
        style,
        width: width || size || '1em',
        height: height || size || '1em',
        'aria-hidden': 'true',
        suppressHydrationWarning: true,
        dangerouslySetInnerHTML: { __html: '' },
      });
    });
    component.displayName = String(name);
    return component;
  }
};

module.exports = new Proxy({}, handler);
