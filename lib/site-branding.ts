export const brandingDefaults={
 'site.color.primary':'#147d67',
 'site.color.hero':'#102b25',
 'site.color.highlight':'#d0ee98',
} as const;
export type BrandColorKey=keyof typeof brandingDefaults;
export const brandingKeys=Object.keys(brandingDefaults) as BrandColorKey[];
export const validColor=(value:string)=>/^#[\da-f]{6}$/i.test(value);
const linear=(n:number)=>n<=.04045?n/12.92:((n+.055)/1.055)**2.4;
export function luminance(hex:string){const rgb=[1,3,5].map(i=>linear(parseInt(hex.slice(i,i+2),16)/255));return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722}
export function contrast(a:string,b:string){const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)}
export function brandingError(colors:Record<BrandColorKey,string>){
 if(brandingKeys.some(k=>!validColor(colors[k])))return 'رنگ‌ها باید با قالب شش‌رقمی مثل #147d67 وارد شوند.';
 if(contrast(colors['site.color.primary'],'#ffffff')<4.5)return 'رنگ اصلی روی زمینهٔ سفید خوانا نیست؛ رنگ تیره‌تری انتخاب کنید.';
 if(contrast(colors['site.color.hero'],'#ffffff')<4.5)return 'متن سفید روی رنگ پس‌زمینهٔ بنر خوانا نیست؛ پس‌زمینه را تیره‌تر کنید.';
 if(contrast(colors['site.color.hero'],colors['site.color.highlight'])<4.5)return 'رنگ تأکیدی روی پس‌زمینهٔ بنر خوانا نیست؛ تضاد رنگ‌ها را بیشتر کنید.';
 return '';
}
