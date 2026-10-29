package com.asterlyra.nihongo;

import androidx.test.core.app.ActivityScenario;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import androidx.test.uiautomator.By;
import androidx.test.uiautomator.UiDevice;
import androidx.test.uiautomator.UiObject2;
import androidx.test.uiautomator.Until;
import org.json.JSONObject;
import org.junit.Test;
import org.junit.runner.RunWith;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import static org.junit.Assert.*;

/** Run only on the dedicated, disposable nihongo-qa emulator. */
@RunWith(AndroidJUnit4.class)
public class OfflineAppTest {
    private ActivityScenario<MainActivity> scenario;
    private final UiDevice device = UiDevice.getInstance(InstrumentationRegistry.getInstrumentation());

    private String js(String code) throws Exception {
        CountDownLatch latch = new CountDownLatch(1);
        AtomicReference<String> value = new AtomicReference<>();
        scenario.onActivity(activity -> activity.getBridge().getWebView().evaluateJavascript(code, result -> {
            value.set(result); latch.countDown();
        }));
        assertTrue("WebView callback timed out", latch.await(10, TimeUnit.SECONDS));
        return value.get();
    }

    private void waitFor(String condition) throws Exception {
        long end = System.currentTimeMillis() + 20000;
        while (System.currentTimeMillis() < end) {
            if ("true".equals(js("Boolean(" + condition + ")"))) return;
            Thread.sleep(150);
        }
        fail("Condition failed: " + condition + "\n" + js("document.body.innerText"));
    }

    private void clickText(String text) throws Exception {
        String quoted = JSONObject.quote(text);
        waitFor("Array.from(document.querySelectorAll('button')).some(b=>b.textContent.trim()===" + quoted + " && !b.disabled)");
        js("Array.from(document.querySelectorAll('button')).find(b=>b.textContent.trim()===" + quoted + ").click()");
    }

    private void settings() throws Exception {
        device.waitForIdle();
        js("document.querySelector('button[aria-label=\"更多导航\"]').click()");
        waitFor("document.querySelector('dialog[open] a[href=\"/settings\"]')");
        js("document.querySelector('dialog[open] a[href=\"/settings\"]').click()");
        waitFor("document.querySelector('.backup-panel')");
    }

    private void cancelPicker() throws Exception {
        assertTrue(device.wait(Until.hasObject(By.pkg("com.google.android.documentsui")), 10000));
        // The first back can dismiss the filename keyboard instead of the picker.
        for (int i = 0; i < 4; i++) {
            Thread.sleep(250);
            device.pressBack();
            if (device.wait(Until.gone(By.pkg("com.google.android.documentsui")), 700)) return;
        }
        fail("File picker did not close");
    }

    private void screenshot(String name) throws Exception {
        Thread.sleep(350); // Let the compositor paint the DOM state checked above.
        java.io.File directory = InstrumentationRegistry.getInstrumentation().getTargetContext().getExternalFilesDir(null);
        assertTrue(device.takeScreenshot(new java.io.File(directory, name + ".png")));
    }

    @Test
    public void upgradeKeepsLearningData() throws Exception {
        scenario = ActivityScenario.launch(MainActivity.class);
        try {
            waitFor("document.querySelector('.overview-page,.home-study-summary')");
            js("window.__qaUpgrade=null;(()=>{const r=indexedDB.open('nihongo-kobumi-v1');r.onsuccess=()=>{const d=r.result;const names=['cards','progress','guards','reviews','practices','decks','notes','settings','sessions','meta'];const t=d.transaction(names);const result={};names.forEach(name=>{const q=t.objectStore(name).getAll();q.onsuccess=()=>result[name]=q.result;});t.oncomplete=()=>{result.meta=result.meta.filter(item=>item.id!=='contentVersion');window.__qaUpgrade=Object.fromEntries(names.map(name=>[name,result[name]]));d.close();};};})();");
            waitFor("window.__qaUpgrade?.reviews?.length>0 && window.__qaUpgrade?.cards?.length>0");
            String snapshot = js("JSON.stringify(window.__qaUpgrade)");
            java.io.File file = new java.io.File(InstrumentationRegistry.getInstrumentation().getTargetContext().getExternalFilesDir(null), "upgrade-baseline.json");
            if ("before".equals(InstrumentationRegistry.getArguments().getString("upgradeMode"))) {
                java.nio.file.Files.write(file.toPath(), snapshot.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            } else {
                assertEquals("All learner data must survive APK upgrade (content version metadata excluded)", new String(java.nio.file.Files.readAllBytes(file.toPath()), java.nio.charset.StandardCharsets.UTF_8), snapshot);
            }
        } finally { if (scenario != null) scenario.close(); }
    }

    private void addReferenceWord(String id, String writing, boolean listening) throws Exception {
        js("document.querySelector('.mobile-nav a[href=\"/courses\"]').click()");
        waitFor("document.querySelector('.course-hub')");
        js("document.querySelector('.course-hub a[href=\"/words\"]').click()");
        waitFor("document.querySelector('input[aria-label=\"搜索单词\"]')");
        js("(()=>{const input=document.querySelector('input[aria-label=\"搜索单词\"]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,"+JSONObject.quote(writing)+");input.dispatchEvent(new Event('input',{bubbles:true}));})()");
        waitFor("document.querySelector('a[href=\"/words/"+id+"\"]')");
        js("document.querySelector('a[href=\"/words/"+id+"\"]').click()");
        waitFor("document.querySelector('.word-detail')");
        waitFor("Array.from(document.querySelectorAll('.word-detail button')).some(b=>b.textContent.trim()==='加入学习'||b.textContent.trim()==='已加入学习')");
        if ("true".equals(js("Array.from(document.querySelectorAll('.word-detail button')).some(b=>b.textContent.trim()==='加入学习'&&!b.disabled)"))) clickText("加入学习");
        waitFor("Array.from(document.querySelectorAll('.word-detail button')).some(b=>b.textContent.trim()==='已加入学习'&&b.disabled)");
        if(listening) clickText("添加听力练习");
        js("document.querySelector('.mobile-nav a[href=\"/study\"]').click()");
        waitFor("document.querySelector('.study-word')");
    }

    /** Select a real UI-created card only in the disposable QA database. */
    private void selectReferenceCard(String id, String skill) throws Exception {
        String card = JSONObject.quote(id+":"+skill+":v1");
        js("window.__qaSelected=false;(()=>{const r=indexedDB.open('nihongo-kobumi-v1');r.onsuccess=()=>{const d=r.result;const t=d.transaction(['sessions','cards'],'readwrite');const q=t.objectStore('sessions').get('active');q.onsuccess=()=>{const s=q.result;t.objectStore('sessions').put({...s,activeId:"+card+",mode:'practice',isIntroduction:false,revealed:false,hintUsed:false,revealedAt:undefined,pendingRating:undefined,updatedAt:Date.now(),revision:s.revision+1,batch:[],completed:[],lastEventId:undefined});};t.oncomplete=()=>{window.__qaSelected=true;d.close();};};})();");
        waitFor("window.__qaSelected");
        scenario.recreate();
        waitFor("document.querySelector('.overview-page')");
        js("document.querySelector('.mobile-nav a[href=\"/study\"]').click()");
        waitFor("document.querySelector('.study-reveal-row[data-concealed=false] .reveal-btn')");
    }

    @Test
    public void stableReferenceLayoutAndRecordEntries() throws Exception {
        scenario = ActivityScenario.launch(MainActivity.class);
        try {
            waitFor("document.querySelector('.overview-page')");
            addReferenceWord("w006","先生",true);
            addReferenceWord("w123","コーヒー",false);
            String geometry="JSON.stringify(['.study-word','.reference-definition','.study-example','.study-actions'].map(s=>{const r=document.querySelector(s).getBoundingClientRect();return [r.x,r.y,r.width,r.height];}))";
            String fits="document.documentElement.scrollWidth<=innerWidth && document.querySelector('.study-reference').scrollHeight<=document.querySelector('.study-reference').clientHeight+1 && document.querySelector('.study-example').getBoundingClientRect().bottom<=document.querySelector('.study-actions').getBoundingClientRect().top && document.querySelector('.study-actions').getBoundingClientRect().bottom<=document.querySelector('.mobile-nav').getBoundingClientRect().top+1";
            for(String skill:new String[]{"meaning","reading","listening"}) {
                selectReferenceCard("w006",skill);
                waitFor("document.querySelector('.study-word').textContent==='先生'");
                assertEquals("true",js("document.querySelector('.reference-definition').inert && document.querySelector('.study-example').inert && getComputedStyle(document.querySelector('.study-example')).visibility==='hidden'"));
                if(skill.equals("listening")) assertEquals("true",js("getComputedStyle(document.querySelector('.study-word')).visibility==='hidden'"));
                if(skill.equals("reading")) assertEquals("true",js("getComputedStyle(document.querySelector('.study-pronunciation')).visibility==='hidden'"));
                String before=js(geometry);
                screenshot("reference-"+skill+"-before");
                js("document.querySelector('.study-reveal-row:not([data-concealed=true]) .reveal-btn').click()");
                waitFor("document.querySelector('.rating-row[data-concealed=false] .rating-3:not(:disabled)')");
                assertEquals("Reveal must keep word, definition, example and action geometry",before,js(geometry));
                assertEquals("true",js(fits));
                assertEquals("true",js("document.querySelector('.study-example ruby').textContent.length>0 && document.querySelector('.study-example .audio-btn').getAttribute('aria-label')==='播放例句'"));
                screenshot("reference-"+skill+"-after");
            }
            js("window.__qaExample='waiting';const originalPlay=HTMLMediaElement.prototype.play;HTMLMediaElement.prototype.play=function(){if(this.src.includes('/audio/ws-w006.mp3')){this.addEventListener('ended',()=>window.__qaExample='ended',{once:true});this.addEventListener('error',()=>window.__qaExample='error',{once:true});}return originalPlay.call(this);};document.querySelector('.study-example .audio-btn').click();");
            waitFor("window.__qaExample==='ended'");
            device.setOrientationLeft();
            waitFor("innerWidth>innerHeight");
            device.waitForIdle();Thread.sleep(1500);
            assertEquals("true",js(fits));
            screenshot("reference-landscape");
            device.setOrientationNatural();waitFor("innerHeight>innerWidth");
            selectReferenceCard("w123","meaning");
            js("document.querySelector('.study-reveal-row:not([data-concealed=true]) .reveal-btn').click()");
            waitFor("document.querySelector('.rating-row[data-concealed=false] .rating-3:not(:disabled)')");
            assertEquals("true",js("!document.querySelector('.reference-reading-line .study-pronunciation') && Array.from(document.querySelectorAll('.study-example ruby')).every(r=>/[\u3400-\u9fff々]/.test(r.childNodes[0].textContent))"));
            screenshot("reference-katakana");
            selectReferenceCard("w006","reading");
            js("document.querySelector('.reference-reading-line .audio-btn').click()");
            waitFor("document.querySelector('.study-hint-slot[data-concealed=true]')===null && document.querySelector('.rating-1:not(:disabled)')");
            assertEquals("true",js("document.querySelector('.rating-3').disabled && document.querySelector('.rating-2').disabled"));
            js("document.querySelector('.mobile-nav a[href=\"/progress\"]').click()");
            waitFor("document.querySelector('.record-detail-entry')");
            assertEquals("true",js("!document.querySelector('.daily-word-list,.weak-words,.history-list')"));
            screenshot("record-overview");
            clickText("查看今天背过的单词");
            waitFor("document.querySelector('dialog .daily-word-list')");
            assertEquals("true",js("document.querySelector('dialog .daily-word-list').textContent.includes('先生')"));
            screenshot("record-word-detail");
            device.pressBack();waitFor("!document.querySelector('dialog[open]')");
        } finally {device.unfreezeRotation();if(scenario!=null)scenario.close();}
    }

    @Test
    public void n5LearningSequenceOfflineAndPersisted() throws Exception {
        scenario=ActivityScenario.launch(MainActivity.class);
        try {
            waitFor("document.querySelector('.overview-page')");
            js("document.querySelector('.mobile-nav a[href=\"/courses\"]').click()");
            waitFor("document.querySelector('.course-n5')");
            screenshot("n5-courses");
            js("document.querySelector('.course-n5').click()");
            waitFor("document.querySelectorAll('.n5-unit').length===16");
            assertEquals("true",js("document.querySelectorAll('.n5-phase').length===4 && document.querySelectorAll('.n5-consolidation details').length===4"));
            screenshot("n5-plan");
            js("document.querySelector('.n5-phase').scrollIntoView({block:'start'})");
            screenshot("n5-phase-one");
            for(int n=1;n<=16;n++) {
                String id=String.format(java.util.Locale.ROOT,"n5-%02d",n);
                js("document.querySelector('.n5-unit[href=\"/courses/n5/"+id+"\"]').click()");
                waitFor("document.querySelector('.foundation-n5 .n5-resources') && document.querySelector('.n5-listening')");
                assertEquals("true",js("document.documentElement.scrollWidth<=innerWidth && document.querySelectorAll('.foundation-example').length===2 && !document.querySelector('.n5-listening-text')"));
                if(n==1) {
                    playN5Audio("s011",".n5-listening .audio-btn");
                    js("document.querySelector('.n5-listening .option-row button').click()");
                    waitFor("document.querySelector('.n5-listening .exercise-result.correct')");
                    clickText("听后查看文字");
                    waitFor("document.querySelector('.n5-listening-text ruby')");
                    js("document.querySelector('.n5-listening .option-row button').click()");
                    waitFor("document.querySelector('.n5-listening').textContent.includes('已展开文字 答对')");
                    js("document.querySelector('.foundation-questions .option-row button').click()");
                    waitFor("document.querySelector('.foundation-questions .exercise-result.correct')");
                    if("true".equals(js("Array.from(document.querySelectorAll('button')).some(b=>b.textContent.trim()==='我已读过这一节'&&!b.disabled)")))clickText("我已读过这一节");
                    waitFor("Array.from(document.querySelectorAll('button')).some(b=>b.textContent.includes('已阅读这一节')&&b.disabled)");
                    js("document.querySelector('.n5-listening').scrollIntoView({block:'start'})");
                    screenshot("n5-listening");
                }
                if(n==8) {
                    assertEquals("true",js("document.querySelector('.foundation-n5').textContent.includes('三本さんぼん') && !!document.querySelector('.n5-checkpoint')"));
                    playN5Audio("ws-w1079",".n5-listening .audio-btn");
                    js("document.querySelectorAll('.foundation-n5 .panel')[1].scrollIntoView({block:'start'})");
                    screenshot("n5-numbers");
                    js("document.querySelector('.n5-resources a[href=\"/words?n5=8\"]').click()");
                    waitFor("location.search==='?n5=8' && document.querySelector('.word-grid')");
                    assertEquals("true",js("document.querySelector('.word-card').getAttribute('data-word-id')==='w1065'"));
                    js("document.querySelector('.word-grid a[href^=\"/words/w1093\"]').click()");
                    waitFor("document.querySelector('.word-detail')");
                    assertEquals("true",js("document.querySelector('.word-detail-title h1').textContent==='十' && Array.from(document.querySelectorAll('.example ruby')).some(r=>r.textContent==='十とお')"));
                    playN5Audio("w1093",".word-detail-title .audio-btn");
                    screenshot("n5-counter-word");
                    device.pressBack();waitFor("location.search==='?n5=8' && document.querySelector('.word-grid')");
                    js("document.querySelector('.mobile-nav a[href=\"/courses\"]').click()");
                    waitFor("document.querySelector('.course-n5')");
                    js("document.querySelector('.course-n5').click()");
                    waitFor("document.querySelectorAll('.n5-unit').length===16");
                    continue;
                }
                js("document.querySelector('.foundation-n5 .back-link').click()");
                waitFor("document.querySelectorAll('.n5-unit').length===16");
            }
            scenario.recreate();waitFor("document.querySelector('.overview-page')");
            js("document.querySelector('.mobile-nav a[href=\"/courses\"]').click()");waitFor("document.querySelector('.course-n5')");
            js("document.querySelector('.course-n5').click()");waitFor("document.querySelector('.n5-unit .chip.done')");
            js("document.querySelector('.n5-unit[href=\"/courses/n5/n5-01\"]').click()");waitFor("document.querySelector('.foundation-n5')");
            waitFor("document.querySelector('.foundation-questions').textContent.includes('上次结果：答对') && document.querySelector('.n5-listening').textContent.includes('未展开文字 答对') && document.querySelector('.n5-listening').textContent.includes('已展开文字 答对')");
            assertEquals("true",js("!document.querySelector('.n5-listening-text')"));
            device.setOrientationLeft();waitFor("innerWidth>innerHeight");device.waitForIdle();Thread.sleep(500);
            assertEquals("true",js("document.documentElement.scrollWidth<=innerWidth"));
            js("window.scrollTo(0,0)");screenshot("n5-lesson-landscape");
            device.setOrientationNatural();waitFor("innerHeight>innerWidth");
            clickText("背本单元未学词");waitFor("document.querySelector('.study-word') && document.querySelector('.n5-study-tag')");
            assertEquals("true",js("document.documentElement.scrollWidth<=innerWidth"));screenshot("n5-study");
            js("document.querySelector('.mobile-nav a[href=\"/progress\"]').click()");waitFor("document.querySelector('.n5-record-summary')");
            assertEquals("true",js("!document.querySelector('.daily-word-list,.weak-words,.history-list')"));
        }finally{device.unfreezeRotation();if(scenario!=null)scenario.close();}
    }

    private void playN5Audio(String id,String selector) throws Exception {
        js("window.__qaN5Audio='waiting';window.__qaN5OriginalPlay??=HTMLMediaElement.prototype.play;HTMLMediaElement.prototype.play=function(){if(this.src.includes('/audio/'+"+JSONObject.quote(id)+"+'.mp3')){this.addEventListener('ended',()=>window.__qaN5Audio='ended',{once:true});this.addEventListener('error',()=>window.__qaN5Audio='error',{once:true});}return window.__qaN5OriginalPlay.call(this);};document.querySelector("+JSONObject.quote(selector)+").click()");
        waitFor("window.__qaN5Audio==='ended'");
    }

    @Test
    public void foundationLessonsOfflineAndPersisted() throws Exception {
        scenario = ActivityScenario.launch(MainActivity.class);
        try {
            waitFor("document.querySelector('.overview-page')");
            js("document.querySelector('.mobile-nav a[href=\"/courses\"]').click()");
            waitFor("document.querySelectorAll('.course-entry').length===7");
            assertEquals("true", js("document.querySelector('.course-entry').getAttribute('href')==='/courses/n5'"));
            screenshot("courses-foundation");
            String[] courses = {"beginner", "pronunciation"};
            int[] counts = {6, 10};
            for (int c = 0; c < courses.length; c++) {
                String course = courses[c];
                js("document.querySelector('a[href=\"/courses/" + course + "\"]').click()");
                waitFor("document.querySelectorAll('.lesson-item').length===" + counts[c]);
                assertEquals("true", js("document.querySelector('.mobile-nav a[href=\"/courses\"]').getAttribute('aria-current')==='page'"));
                screenshot(course + "-directory");
                for (int i = 0; i < counts[c]; i++) {
                    js("document.querySelectorAll('.lesson-item')[" + i + "].click()");
                    waitFor("document.querySelector('.foundation-questions')");
                    assertEquals("true", js("document.documentElement.scrollWidth<=innerWidth"));
                    assertEquals("true", js("document.querySelectorAll('.foundation-example').length>=2 && document.querySelectorAll('.reading-question').length===2"));
                    if (c == 0 && i == 0) {
                        js("document.querySelector('.reading-question .option-row button').click()");
                        waitFor("document.querySelector('.exercise-result')");
                        assertEquals("true", js("document.querySelector('.exercise-result').textContent.includes('再看一下')"));
                        clickText("看注音并听日语发音");
                        waitFor("document.querySelector('.exercise-result.correct')");
                        if ("true".equals(js("Array.from(document.querySelectorAll('button')).some(b=>b.textContent.trim()==='我已读过这一节' && !b.disabled)"))) clickText("我已读过这一节");
                        waitFor("Array.from(document.querySelectorAll('button')).some(b=>b.textContent.includes('已阅读这一节')&&b.disabled)");
                        js("document.querySelector('.foundation-example .audio-btn').click()");
                        waitFor("!document.querySelector('.audio-btn.is-playing') && !document.querySelector('.audio-btn[aria-busy=\"true\"]')");
                        screenshot("beginner-first-lesson");
                    }
                    if (c == 1 && i == 3) {
                        if ("true".equals(js("Array.from(document.querySelectorAll('button')).some(b=>b.textContent.trim()==='我已读过这一节' && !b.disabled)"))) clickText("我已读过这一节");
                        waitFor("Array.from(document.querySelectorAll('button')).some(b=>b.textContent.includes('已阅读这一节')&&b.disabled)");
                        screenshot("long-vowels");
                    }
                    if (c == 1 && i == 7) {
                        assertEquals("true", js("document.querySelectorAll('.pitch-diagram svg[role=\"img\"]').length===4"));
                        js("document.querySelector('.pitch-diagram').scrollIntoView({block:'start'})");
                        screenshot("pitch-patterns");
                    }
                    js("document.querySelector('.foundation-page .back-link').click()");
                    waitFor("document.querySelectorAll('.lesson-item').length===" + counts[c]);
                }
                js("document.querySelector('.foundation-page .back-link').click()");
                waitFor("document.querySelector('.course-hub')");
            }
            scenario.recreate();
            waitFor("document.querySelector('.overview-page')");
            js("document.querySelector('.mobile-nav a[href=\"/courses\"]').click()");
            waitFor("document.querySelector('.course-hub')");
            js("document.querySelector('a[href=\"/courses/beginner\"]').click()");
            waitFor("document.querySelector('.lesson-item .chip.done')");
            js("document.querySelector('.lesson-item').click()");
            waitFor("document.querySelector('.foundation-questions')");
            waitFor("document.body.innerText.replace(/\\s/g,'').includes('上次结果：答对')");
            assertEquals("true", js("Array.from(document.querySelectorAll('button')).some(b=>b.textContent.includes('已阅读这一节')&&b.disabled)"));
            js("document.querySelector('.mobile-nav a[href=\"/progress\"]').click()");
            waitFor("document.querySelector('.foundation-progress-row')");
            waitFor("document.querySelector('.foundation-progress-row').textContent.includes('最近答对 1 / 1')");
        } finally { if (scenario != null) scenario.close(); }
    }

    @Test
    public void finalAppearanceAndPackagedResources() throws Exception {
        scenario = ActivityScenario.launch(MainActivity.class);
        try {
            waitFor("document.querySelector('.overview-page')");
            assertEquals("true", js("document.documentElement.scrollWidth<=innerWidth"));
            assertEquals("true", js("document.querySelectorAll('.overview-page a,.overview-page button,.overview-page input').length===0"));
            assertEquals("true", js("Array.from(document.querySelectorAll('.mobile-nav a')).map(a=>a.textContent).join(',')==='概览,背词,课程,记录'"));
            screenshot("home");
            js("document.querySelector('a[href=\"/study\"]').click()");
            waitFor("document.querySelector('.study-word')");
            selectReferenceCard("w006","meaning");
            waitFor("document.querySelector('.study-word').textContent==='先生'");
            if ("true".equals(js("Array.from(document.querySelectorAll('button')).some(b=>b.textContent.trim()==='重新回忆')"))) clickText("重新回忆");
            for (int i = 0; i < 10 && "true".equals(js("Boolean(document.querySelector('.study-start'))")); i++) {
                String before = js("document.querySelector('.study-word')?.textContent");
                js("document.querySelector('.study-start').click()");
                waitFor("!document.querySelector('.study-start') || document.querySelector('.study-word')?.textContent!==" + before);
            }
            waitFor("document.querySelector('.study-reveal-row:not([data-concealed=true]) .reveal-btn') || document.querySelector('.rating-3:not(:disabled)')");
            if ("true".equals(js("Boolean(document.querySelector('.study-reveal-row:not([data-concealed=true]) .reveal-btn'))"))) js("document.querySelector('.study-reveal-row:not([data-concealed=true]) .reveal-btn').click()");
            waitFor("document.querySelector('.rating-3:not(:disabled)')");
            String visibleButtons = "Array.from(document.querySelectorAll('.rating-row button')).every(b=>{const r=b.getBoundingClientRect();const nav=document.querySelector('.mobile-nav').getBoundingClientRect();return r.top>=0 && r.bottom<=Math.min(nav.top,innerHeight) && nav.bottom<=innerHeight+1 && r.left>=0 && r.right<=innerWidth;})";
            assertEquals("true", js(visibleButtons));
            screenshot("study-portrait");
            device.setOrientationLeft();
            waitFor("innerWidth>innerHeight");
            device.waitForIdle();
            Thread.sleep(1500);
            android.util.Log.i("NihongoLayout", js("JSON.stringify({width:innerWidth,height:innerHeight,nav:document.querySelector('.mobile-nav').getBoundingClientRect().toJSON(),main:document.querySelector('.main-content').getBoundingClientRect().toJSON()})"));
            assertEquals("true", js(visibleButtons));
            assertEquals("true", js("document.documentElement.scrollWidth<=innerWidth"));
            assertEquals("true", js("document.querySelector('.study-reading-line .audio-btn').getBoundingClientRect().bottom<=document.querySelector('.study-actions').getBoundingClientRect().top"));
            screenshot("study-landscape");
            device.setOrientationNatural();
            waitFor("innerHeight>innerWidth");
            js("document.querySelector('.mobile-nav a[href=\"/courses\"]').click()");
            waitFor("document.querySelector('.course-hub')");
            assertEquals("true", js("document.querySelectorAll('.course-hub a').length===7"));
            screenshot("courses");
            js("document.querySelector('.course-hub a[href=\"/words\"]').click()");
            waitFor("document.querySelector('.word-grid')");
            assertEquals("true", js("document.querySelectorAll('.main-content a[href=\"/plan\"]').length===1 && document.querySelector('.mobile-nav a[href=\"/courses\"]').getAttribute('aria-current')==='page'"));
            waitFor("document.querySelector('a[href=\"/words/w001\"]')");
            js("document.querySelector('a[href=\"/words/w001\"]').click()");
            waitFor("document.querySelector('.sentence-analysis')");
            js("document.querySelector('.sentence-analysis').open=true");
            waitFor("document.querySelector('.analysis-body')");
            assertEquals("true", js("document.querySelector('.analysis-body').innerText.includes('自然译文')"));
            js("window.__qaKana='loading';window.__qaKanaPlayer=new Audio('/audio/'+encodeURIComponent('k-0-あ')+'.mp3');window.__qaKanaPlayer.onended=()=>window.__qaKana='ended';window.__qaKanaPlayer.onerror=()=>window.__qaKana='error';window.__qaKanaPlayer.play().catch(()=>window.__qaKana='error');");
            waitFor("window.__qaKana==='ended'");
            js("document.querySelector('button[aria-label=\"更多导航\"]').click()");
            waitFor("document.querySelector('dialog[open]')");
            assertEquals("true", js("Array.from(document.querySelectorAll('dialog nav a')).map(a=>a.getAttribute('href')).join(',')==='/kana,/settings'"));
            screenshot("more");
            device.pressBack();
            waitFor("!document.querySelector('dialog[open]')");
            js("document.querySelector('.mobile-nav a[href=\"/progress\"]').click()");
            waitFor("document.querySelector('.daily-record-summary') && location.pathname==='/progress'");
            assertEquals("true", js("!document.querySelector('input[aria-label=\"每日词汇量\"]')"));
            settings();
            assertEquals("true", js("document.querySelectorAll('input[aria-label=\"每日词汇量\"]').length===1 && document.documentElement.scrollWidth<=innerWidth"));
            screenshot("settings");
        } finally {
            device.unfreezeRotation();
            if (scenario != null) scenario.close();
        }
    }

    @Test
    public void offlineLearningPersistenceAndDocuments() throws Exception {
        // This test deliberately uses only emulator data, never the desktop browser DB.
        scenario = ActivityScenario.launch(MainActivity.class);
        try {
            waitFor("document.querySelector('.overview-page')");
            js("document.querySelector('a[href=\"/study\"]').click()");
            waitFor("document.querySelector('.study-start')");
            assertEquals("true", js("Array.from(document.querySelectorAll('.study-example')).some(e=>e.innerText.length>0)"));
            // The mixed queue can introduce the other members of the same group
            // before presenting the first recall card.
            for (int i = 0; i < 10 && "true".equals(js("Boolean(document.querySelector('.study-start'))")); i++) {
                String wordBefore = js("document.querySelector('.study-word')?.textContent");
                js("document.querySelector('.study-start').click()");
                waitFor("!document.querySelector('.study-start') || document.querySelector('.study-word')?.textContent!==" + wordBefore);
            }
            waitFor("document.querySelector('.study-reveal-row:not([data-concealed=true]) .reveal-btn')");
            js("document.querySelector('.study-reveal-row:not([data-concealed=true]) .reveal-btn').click()");
            waitFor("document.querySelector('.rating-3:not(:disabled)')");
            js("document.querySelector('.rating-3').click()");
            waitFor("!document.querySelector('.rating-3:not(:disabled)')");
            js("window.__qaDB=null;const request=indexedDB.open('nihongo-kobumi-v1');request.onsuccess=()=>{const database=request.result;const tx=database.transaction(['reviews','progress']);const reviews=tx.objectStore('reviews').count();const progress=tx.objectStore('progress').count();tx.oncomplete=()=>{window.__qaDB={reviews:reviews.result,progress:progress.result};database.close();};}");
            waitFor("window.__qaDB?.reviews===1 && window.__qaDB?.progress>=1");
            String first = js("JSON.stringify(window.__qaDB)");

            // Test a packaged MP3 through the actual Android WebView audio engine.
            js("window.__qaAudio='loading';window.__qaPlayer=new Audio('/audio/w001.mp3');window.__qaPlayer.onended=()=>window.__qaAudio='ended';window.__qaPlayer.onerror=()=>window.__qaAudio='error';window.__qaPlayer.play().catch(()=>window.__qaAudio='error');");
            waitFor("window.__qaAudio==='ended'");
            scenario.recreate();
            waitFor("document.querySelector('a[href=\"/study\"]') && !document.querySelector('.loading')");
            js("window.__qaDB=null;const r=indexedDB.open('nihongo-kobumi-v1');r.onsuccess=()=>{const d=r.result;const t=d.transaction(['reviews','progress']);const a=t.objectStore('reviews').count();const b=t.objectStore('progress').count();t.oncomplete=()=>{window.__qaDB={reviews:a.result,progress:b.result};d.close();};}");
            waitFor("window.__qaDB?.reviews===1");
            assertEquals(first, js("JSON.stringify(window.__qaDB)"));
            js("document.querySelector('.mobile-nav a[href=\"/courses\"]').click()");
            waitFor("document.querySelector('.course-hub')");
            js("document.querySelector('a[href=\"/courses/beginner\"]').click()");
            waitFor("document.querySelector('.lesson-item')");
            js("document.querySelector('.lesson-item').click()");
            waitFor("document.querySelector('.foundation-questions')");
            clickText("我已读过这一节");
            clickText("看注音并听日语发音");
            waitFor("document.querySelector('.exercise-result.correct')");
            settings();
            clickText("导出完整备份");
            cancelPicker();
            waitFor("Array.from(document.querySelectorAll('button')).some(b=>b.textContent.trim()==='导出完整备份' && !b.disabled)");
            assertEquals("true", js("document.body.innerText.includes('还没有准备过备份')"));
            clickText("导出完整备份");
            UiObject2 save = device.wait(Until.findObject(By.text(java.util.regex.Pattern.compile("(?i)save"))), 10000);
            assertNotNull("System save button", save);
            UiObject2 filename = device.findObject(By.clazz("android.widget.EditText"));
            assertNotNull("System filename field", filename); filename.setText("qa-backup.json");
            save.click();
            waitFor("document.body.innerText.includes('最近准备导出')");
            assertEquals("true", js("document.body.innerText.includes('最近准备导出')"));
            clickText("导入备份");
            cancelPicker();
            waitFor("!document.querySelector('dialog[open]')");
            assertEquals("true", js("document.body.innerText.includes('最近准备导出')"));

            // Import the file just saved by the native document provider.
            clickText("导入备份");
            UiObject2 exportedFile = device.wait(Until.findObject(By.text("qa-backup.json")), 10000);
            assertNotNull("Exported JSON in system picker", exportedFile); exportedFile.click();
            waitFor("document.querySelector('dialog[open]')?.innerText.includes('恢复备份之前')");
            js("window.__qaNote=false;const n=indexedDB.open('nihongo-kobumi-v1');n.onsuccess=()=>{const d=n.result;const t=d.transaction(['notes'],'readwrite');t.objectStore('notes').put({id:'w001',text:'恢复前新笔记'});t.oncomplete=()=>{window.__qaNote=true;d.close();};}");
            waitFor("window.__qaNote");
            js("document.querySelector('dialog .confirm-label input').click()");
            clickText("确认恢复");
            cancelPicker();
            waitFor("document.querySelector('dialog[open]') && Array.from(document.querySelectorAll('button')).some(b=>b.textContent.trim()==='确认恢复' && !b.disabled)");
            js("window.__qaNote=null;const c=indexedDB.open('nihongo-kobumi-v1');c.onsuccess=()=>{const d=c.result;const t=d.transaction(['notes']);const q=t.objectStore('notes').get('w001');q.onsuccess=()=>{window.__qaNote=q.result?.text;d.close();};}");
            waitFor("window.__qaNote==='恢复前新笔记'");
            clickText("确认恢复");
            save = device.wait(Until.findObject(By.text(java.util.regex.Pattern.compile("(?i)save"))), 10000);
            assertNotNull("Safety backup save button", save);
            filename = device.findObject(By.clazz("android.widget.EditText"));
            filename.setText("qa-before-restore.json"); save.click();
            waitFor("!document.querySelector('dialog[open]') && Array.from(document.querySelectorAll('button')).some(b=>b.textContent.trim()==='导出完整备份' && !b.disabled)");
            js("window.__qaNote=null;const a=indexedDB.open('nihongo-kobumi-v1');a.onsuccess=()=>{const d=a.result;const t=d.transaction(['notes']);const q=t.objectStore('notes').count();q.onsuccess=()=>{window.__qaNote=q.result;d.close();};}");
            waitFor("window.__qaNote===0");
            js("window.__qaLesson=null;const l=indexedDB.open('nihongo-kobumi-v1');l.onsuccess=()=>{const d=l.result;const t=d.transaction(['progress']);const q=t.objectStore('progress').get('b01');q.onsuccess=()=>{window.__qaLesson=q.result;d.close();};}");
            waitFor("window.__qaLesson?.readAt && window.__qaLesson?.results?.['0']===true");

            // Android back closes the app's menu before changing pages.
            js("document.querySelector('button[aria-label=\"更多导航\"]').click()");
            waitFor("document.querySelector('dialog[open]')");
            device.pressBack();
            waitFor("!document.querySelector('dialog[open]')");
            assertEquals("true", js("location.pathname==='/settings'"));
            device.takeScreenshot(new java.io.File(InstrumentationRegistry.getInstrumentation().getTargetContext().getExternalFilesDir(null), "settings.png"));
        } finally { if (scenario != null) scenario.close(); }
    }
}
