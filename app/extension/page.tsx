import Link from 'next/link';

export const metadata={title:'Signal Collector · Install the X extension'};

export default function ExtensionPage(){return <>
  <header className="topbar"><Link className="brand" href="/"><span className="brand-mark"><i/><i/><i/><i/></span>signal</Link><nav><Link href="/">Workspace</Link><Link href="/extension" className="nav-active">Extension</Link></nav></header>
  <main className="page" style={{maxWidth:920}}>
    <span className="eyebrow">SIGNAL COLLECTOR · CHROME / EDGE</span>
    <h1 style={{fontSize:52,fontWeight:400,lineHeight:1.1,letterSpacing:'-2px',margin:'20px 0'}}>Save a post on X. Decide what to write.</h1>
    <p style={{fontSize:18,maxWidth:650,color:'#5c674c'}}>Collect the post you are reading, see a JEV score, then open it in your local Signal workspace.</p>
    <a className="btn primary" style={{margin:'22px 0 30px'}} href="/Signal-Collector-v1.1.1.zip" download>Download Signal Collector v1.1.1 ↓</a>
    <div style={{borderTop:'1px solid #aeb5a3',paddingTop:28}}><h2 style={{fontWeight:400,fontSize:28}}>Set up in six steps</h2>
    <ol style={{lineHeight:1.9,fontSize:16,paddingLeft:26,maxWidth:700}}>
      <li>Download the ZIP above and extract it to a folder you will keep.</li>
      <li>Open <strong>chrome://extensions</strong> (or <strong>edge://extensions</strong>), turn on Developer mode, choose <strong>Load unpacked</strong>, and select the <strong>Signal-Collector/extension</strong> folder.</li>
      <li>Open <Link href="/" style={{textDecoration:'underline'}}>Signal Desk</Link> in the same browser profile. In Settings, enter your X handle, account direction and current projects, then save.</li>
      <li>Save your own JEV API Key in Signal Desk Settings or in the extension popup. JEV reviews use your API credits.</li>
      <li>In the extension popup, click <strong>Check connection</strong>. This checks access to Signal Desk and your saved direction. Your Key is verified when the first post is analyzed.</li>
      <li>Refresh X, then click <strong>↗ Signal</strong> under a post. Find it later in Collector and Workspace.</li>
    </ol></div>
    <p style={{fontSize:13,color:'#657057',marginTop:30}}>No Signal login needed. Posts and drafts stay in this browser. The selected post and your profile are sent to JEV when you request analysis.</p>
  </main>
</>}
