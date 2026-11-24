export default function BrandMark({className=''}:{className?:string}) {
  return <span className={`brand-mark ${className}`} aria-hidden="true">
    <svg viewBox="0 0 48 48" role="img" focusable="false">
      <path d="M23.8 4.5c-2.2 0-4 1.8-4 4v9.3h-1.2v-6.1c0-2-1.6-3.7-3.7-3.7s-3.7 1.7-3.7 3.7v12.8l-1.5-1.4a3.8 3.8 0 0 0-5.3 5.4l8.1 8.1v2.2h22.1v-5.2c0-2.2-1.8-4-4-4h-3V8.5c0-2.2-1.8-4-4-4s-4 1.8-4 4v9.3h-.8V8.5c0-2.2-1.8-4-4-4z"/>
      <path d="M5 37.4c6.8-2.3 12.8-1.3 19 3.2 6.2-4.5 12.2-5.5 19-3.2v6.1c-6.8-2.3-12.8-1.3-19 3.2-6.2-4.5-12.2-5.5-19-3.2z"/>
    </svg>
  </span>
}
