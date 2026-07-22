import React from 'react';
import { Text, TextInput } from 'react-native';

// Apply the app font (Inter, an SF Pro-like open font) to every Text/TextInput
// without editing every style. Inter is a variable font, so existing
// `fontWeight` values still select the right weight. A component's own
// `fontFamily` (if any) wins because it comes later in the style array.
const FONT_FAMILY = 'Inter';

function applyDefaultFont(Component: unknown) {
  const c = Component as {
    render?: (...args: unknown[]) => React.ReactElement | null;
    __knockFontPatched?: boolean;
  };
  if (!c || typeof c.render !== 'function' || c.__knockFontPatched) return;

  const originalRender = c.render;
  c.__knockFontPatched = true;
  c.render = function patchedRender(...args: unknown[]) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const element: any = originalRender.apply(this, args);
    if (!element) return element;
    return React.cloneElement(element, {
      style: [{ fontFamily: FONT_FAMILY }, element.props.style],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
  };
}

applyDefaultFont(Text);
applyDefaultFont(TextInput);
