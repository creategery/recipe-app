'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const APP_URL = 'https://recipe-app-seven-pied-95.vercel.app';

function buildBookmarklet(appUrl: string) {
  const js = `(function(){
function find(o){if(!o)return null;if(o['@type']==='Recipe')return o;if(Array.isArray(o)){for(var i=0;i<o.length;i++){var f=find(o[i]);if(f)return f;}}if(typeof o==='object'){var v=Object.values(o);for(var i=0;i<v.length;i++){var f=find(v[i]);if(f)return f;}}return null;}
var recipe=null;
document.querySelectorAll('script[type="application/ld+json"]').forEach(function(s){if(recipe)return;try{recipe=find(JSON.parse(s.textContent));}catch(e){}});
var d={sourceUrl:location.href,title:'',image:'',ingredients:[],instructions:[],servings:'',cookTime:''};
if(recipe){
d.title=recipe.name||'';
var img=recipe.image;d.image=img?(typeof img==='string'?img:Array.isArray(img)?img[0]:img.url||''):'';
d.ingredients=recipe.recipeIngredient||[];
var raw=recipe.recipeInstructions||[];
d.instructions=(typeof raw==='string'?[raw]:raw.flatMap(function(i){if(typeof i==='string')return[i];if(i['@type']==='HowToSection')return(i.itemListElement||[]).map(function(s){return s.text||s.name||'';});return[i.text||i.name||''];})).filter(Boolean);
var y=recipe.recipeYield;if(y)d.servings=(Array.isArray(y)?y[0]:y)+'';
var t=recipe.totalTime||recipe.cookTime||'';if(t){var m=t.match(/PT(?:(\\d+)H)?(?:(\\d+)M)?/);if(m){var h=+m[1]||0,mn=+m[2]||0;d.cookTime=h&&mn?h+'h '+mn+'m':h?h+'h':mn?mn+'m':t;}else d.cookTime=t;}
}else{
d.title=document.title.split('|')[0].split(' - ')[0].trim();
var og=document.querySelector('meta[property="og:image"]');if(og)d.image=og.getAttribute('content')||'';
}
window.open('${appUrl}/save?data='+encodeURIComponent(btoa(unescape(encodeURIComponent(JSON.stringify(d))))));
})();`;
  return 'javascript:' + js.replace(/\n/g, '');
}

export default function BookmarkletPage() {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const bookmarkletHref = buildBookmarklet(APP_URL);

  useEffect(() => {
    // Warn if opened on mobile — drag-to-bookmark doesn't work on mobile
  }, []);

  function handleCopy() {
    navigator.clipboard.writeText(bookmarkletHref);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="sticky top-0 z-30 bg-white border-b border-stone-100 shadow-sm">
        <div className="flex items-center gap-3 px-4 h-14">
          <button onClick={() => router.push('/')} className="text-stone-400 active:text-stone-600">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-lg font-bold text-stone-800 flex-1">Save Bookmarklet</h1>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">

        <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 text-sm text-stone-600">
          <p className="font-semibold text-stone-800 mb-1">What this does</p>
          <p>When you&apos;re on any recipe page — Food Network, NYT Cooking, Epicurious, anywhere — tap this bookmark and it instantly sends the recipe to Recipease. No copy-pasting needed.</p>
        </div>

        {/* Desktop instructions */}
        <div className="space-y-3">
          <p className="text-sm font-semibold text-stone-700">On desktop (Chrome / Safari / Firefox)</p>
          <ol className="space-y-2 text-sm text-stone-600 list-decimal list-inside">
            <li>Make sure your bookmarks bar is visible</li>
            <li>Drag the button below to your bookmarks bar</li>
            <li>That&apos;s it — tap it on any recipe page</li>
          </ol>

          <a
            href={bookmarkletHref}
            onClick={e => e.preventDefault()}
            draggable
            className="inline-flex items-center gap-2 bg-orange-500 text-white px-5 py-3 rounded-xl font-medium text-sm select-none cursor-grab active:cursor-grabbing shadow-sm"
          >
            🍳 Save to Recipease
          </a>
          <p className="text-xs text-stone-400">Drag this button to your bookmarks bar ↑</p>
        </div>

        <hr className="border-stone-200" />

        {/* Mobile instructions */}
        <div className="space-y-3">
          <p className="text-sm font-semibold text-stone-700">On iPhone / Android</p>
          <p className="text-xs text-stone-500">You can&apos;t drag on mobile, but you can add it manually in a few steps:</p>
          <ol className="space-y-2 text-sm text-stone-600 list-decimal list-inside">
            <li>Tap <strong>Copy code</strong> below</li>
            <li>Bookmark any page in Safari (share → Add Bookmark)</li>
            <li>Open your bookmarks, find the one you just added, tap <strong>Edit</strong></li>
            <li>Clear the URL field and paste the copied code</li>
            <li>Save — now tap it on any recipe page</li>
          </ol>

          <button
            onClick={handleCopy}
            className="flex items-center gap-2 border border-stone-200 bg-white text-stone-700 px-4 py-3 rounded-xl text-sm font-medium active:bg-stone-50"
          >
            {copied ? '✓ Copied!' : '📋 Copy bookmarklet code'}
          </button>
        </div>

        <hr className="border-stone-200" />

        {/* Test it */}
        <div className="space-y-2">
          <p className="text-sm font-semibold text-stone-700">Test it</p>
          <p className="text-xs text-stone-500">Try it on a recipe you know works:</p>
          <a
            href="https://www.seriouseats.com/the-food-lab-complete-guide-to-sous-vide-chicken-breast"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-orange-500 underline block"
          >
            Serious Eats — open this recipe, then tap your bookmarklet →
          </a>
        </div>

      </div>
    </div>
  );
}
