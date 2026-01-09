import tailwindConfig from '../../tailwind.config';

describe('Tailwind Configuration', () => {
  it('should have darkMode configured with class strategy', () => {
    expect(tailwindConfig.darkMode).toEqual(['class']);
  });

  it('should extend theme with sentinel brand colors', () => {
    expect(tailwindConfig.theme?.extend?.colors).toHaveProperty('sentinel');
    const sentinel = (tailwindConfig.theme?.extend?.colors as any).sentinel;
    expect(sentinel).toHaveProperty('50', '#f0f9ff');
    expect(sentinel).toHaveProperty('500', '#0ea5e9');
    expect(sentinel).toHaveProperty('950', '#082f49');
  });

  it('should configure CSS variables for semantic tokens', () => {
    const colors = tailwindConfig.theme?.extend?.colors as any;
    expect(colors).toHaveProperty('primary');
    expect(colors).toHaveProperty('secondary');
    expect(colors).toHaveProperty('muted');
    expect(colors).toHaveProperty('accent');
    expect(colors).toHaveProperty('destructive');
  });

  it('should configure border radius tokens', () => {
    const borderRadius = tailwindConfig.theme?.extend?.borderRadius;
    expect(borderRadius).toHaveProperty('lg', 'var(--radius)');
    expect(borderRadius).toHaveProperty('md', 'calc(var(--radius) - 2px)');
    expect(borderRadius).toHaveProperty('sm', 'calc(var(--radius) - 4px)');
  });

  it('should configure animation keyframes', () => {
    const keyframes = tailwindConfig.theme?.extend?.keyframes;
    expect(keyframes).toHaveProperty('accordion-down');
    expect(keyframes).toHaveProperty('accordion-up');
  });

  it('should include tailwindcss-animate plugin', () => {
    expect(tailwindConfig.plugins).toHaveLength(1);
    expect(tailwindConfig.plugins).toBeDefined();
  });

  it('should configure font families', () => {
    const fontFamily = tailwindConfig.theme?.extend?.fontFamily as any;
    expect(fontFamily).toHaveProperty('sans');
    expect(fontFamily).toHaveProperty('mono');
  });

  it('should have content paths configured', () => {
    expect(tailwindConfig.content).toContain('./pages/**/*.{js,ts,jsx,tsx,mdx}');
    expect(tailwindConfig.content).toContain('./components/**/*.{js,ts,jsx,tsx,mdx}');
    expect(tailwindConfig.content).toContain('./app/**/*.{js,ts,jsx,tsx,mdx}');
  });
});
