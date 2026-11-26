export interface SchoolScene {
  id: string;
  title: string;
  speaker: 'الطفلة' | 'سارة';
  pose: 'young-worried' | 'young-asking' | 'young-think' | 'young-confident' | 'young-practice' | 'young-greet' | 'friend-greet' | 'friend-explain' | 'friend-breathe' | 'friend-stance' | 'friend-inhale' | 'friend-exhale' | 'friend-ideas';
  text: string;
  address?: 'partner' | 'learner';
  visual?: 'breath-ready' | 'inhale' | 'exhale' | 'breath-practice' | 'scattered' | 'ordered';
  teaching?: boolean;
  finale?: boolean;
}

/** One line per turn, so the learner controls the pace of the conversation. */
export const SCHOOL_STORY: readonly SchoolScene[] = [
  { id:'hall-greeting', title:'لقاء في الممر', speaker:'سارة', pose:'friend-greet', text:'صباح الخير! أنا سارة. هل أنتِ في صفّنا؟' },
  { id:'forgotten', title:'ماذا لو نسيت؟', speaker:'الطفلة', pose:'young-worried', text:'صباح النور! أنا متوترة؛ أخاف أن أنسى ما حفظته حين أتحدث أمام الصف.' },
  { id:'normal', title:'لستِ وحدك', speaker:'سارة', pose:'friend-explain', text:'أفهمكِ. أشعر بالتوتر أحيانًا أيضًا، وهذا أمر طبيعي عندما نجرب شيئًا جديدًا.' },
  { id:'father', title:'ما علّمني أبي', speaker:'سارة', pose:'friend-explain', text:'علّمني أبي تنفّسًا هادئًا ووقفة مريحة يساعدانني عندما أتوتر. هيا نجرّبهما معًا!' },
  { id:'breath-question', title:'كيف أتنفّس؟', speaker:'الطفلة', pose:'young-asking', text:'كيف أبدأ يا سارة؟' },
  { id:'breathe-prepare', title:'أستعدّ للتنفّس', speaker:'سارة', pose:'friend-breathe', visual:'breath-ready', teaching:true, text:'خذ وضعًا مريحًا. إن أحببت، ضع يدًا برفق على بطنك لتلاحظ حركته.' },
  { id:'inhale', title:'شهيق هادئ', speaker:'سارة', pose:'friend-inhale', visual:'inhale', teaching:true, text:'خذ شهيقًا لطيفًا من أنفك، بالقدر المريح لك، من دون أن تُجبر نفسك.' },
  { id:'exhale', title:'زفير هادئ', speaker:'سارة', pose:'friend-exhale', visual:'exhale', teaching:true, text:'الآن أخرج الهواء ببطء وراحة من فمك. لا تحتاج إلى حبس نفسك.' },
  { id:'breathe-practice', title:'دورك في التجربة', speaker:'سارة', pose:'friend-breathe', visual:'breath-practice', teaching:true, text:'جرّب نفسًا هادئًا آخر على راحتك. إذا شعرت بالدوار أو عدم الراحة، توقّف وتنفس بشكل طبيعي.' },
  { id:'ideas-scattered', title:'أفكاري متزاحمة', speaker:'سارة', pose:'friend-ideas', visual:'scattered', teaching:true, text:'أحيانًا تتزاحم الأفكار في رأسي، ولا أعرف من أين أبدأ. لا بأس؛ يمكنني التوقف لحظة.' },
  { id:'ideas-ordered', title:'فكرة في كل مرة', speaker:'سارة', pose:'friend-ideas', visual:'ordered', teaching:true, text:'أرتّب أفكاري ببساطة: أبدأ باسمي، ثم مدرستي، ثم شيء أحبّه. فكرة واحدة في كل مرة.' },
  { id:'young-breath', title:'لحظة هدوء', speaker:'الطفلة', pose:'young-think', text:'سأتوقف لحظة وأتنفّس بهدوء قبل أن أبدأ.' },
  { id:'stance-intro', address:'learner', title:'وقفة مريحة', speaker:'سارة', pose:'friend-stance', teaching:true, text:'وعلّمني أبي أيضًا أن أقف بثبات وراحة، من دون شدّ جسمي.' },
  { id:'feet', address:'learner', title:'قدماي على الأرض', speaker:'سارة', pose:'friend-stance', teaching:true, text:'ضع قدميك على الأرض متباعدتين قليلًا، وأرخِ ركبتيك. يمكنك الجلوس براحة إن كان الوقوف غير مناسب لك.' },
  { id:'shoulders', address:'learner', title:'أرخي كتفيّ', speaker:'سارة', pose:'friend-stance', teaching:true, text:'اجعل ظهرك معتدلًا وأرخِ كتفيك ويديك. لا تحتاج أن تتصلّب أو تقف بطريقة مثالية.' },
  { id:'stance-practice', address:'learner', title:'نجرب الوقفة', speaker:'سارة', pose:'friend-stance', teaching:true, text:'وأنت، جرّب الوقفة أو الجلسة المريحة، ثم خذ نفسًا هادئًا إذا أحببت.' },
  { id:'forget-question', title:'إن نسيتُ كلامي؟', speaker:'الطفلة', pose:'young-asking', text:'وماذا أفعل إذا نسيتُ كلمة وأنا أتحدث؟' },
  { id:'forget-help', title:'أتوقّف وأكمل', speaker:'سارة', pose:'friend-ideas', teaching:true, text:'لا بأس! توقّف لحظة، وخذ نفسًا مريحًا، ثم ابدأ بالفكرة التي تتذكرها. يمكنك النظر إلى ملاحظاتك أو طلب مساعدة المعلمة.' },
  { id:'ideas', title:'المعنى أهم', speaker:'سارة', pose:'friend-ideas', teaching:true, text:'ليس عليك تذكّر كل كلمة بالضبط. تحدّث عن نفسك بطريقتك، وفكرة واحدة في كل مرة تكفي.' },
  { id:'try', title:'أحاول من جديد', speaker:'الطفلة', pose:'young-practice', text:'سأقف براحة، وأتنفس بهدوء، ثم أبدأ باسمي وما أحبّه. وإذا نسيت، سأتوقف وأكمل.' },
  { id:'voice', address:'learner', title:'صوتي يصل', speaker:'سارة', pose:'friend-ideas', teaching:true, text:'وأنت أيضًا، جرّب تحيةً بصوت واضح ومريح يسمعه من أمامك، من دون صراخ.' },
  { id:'young-end', address:'learner', title:'خطوة شجاعة', speaker:'الطفلة', pose:'young-confident', text:'مرحبًا! أحب القصص، وهوايتي الرسم. أنا سعيدة بالتعرّف إليكم!' },
  { id:'finish', address:'learner', title:'نتقدّم معًا', speaker:'سارة', pose:'friend-explain', teaching:true, finale:true, text:'أحسنتما! عندما نشعر بالتوتر، يمكننا أن نجرّب نفسًا هادئًا ووقفة مريحة، ونطلب المساعدة حين نحتاجها.' },
];
