export default function BrandMark({className=''}:{className?:string}) {
  return <span className={`brand-mark ${className}`} aria-hidden="true">
    <svg viewBox="0 0 48 48" role="img" focusable="false" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 17.5 31 8v32L4 30.5z"/>
      <path d="M11 30.8 16.2 44h9l-5.5-15.8z"/>
      <path d="M31 12.5 38 8v32l-7-4.5z"/>
      <path d="M40.5 15.5 45 12M41.5 24h5M40.5 32.5 45 36" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="square"/>
    </svg>
  </span>
}
