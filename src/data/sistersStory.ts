/** Each turn has one speaker and one narrative or teaching purpose. */
export interface SistersScene {
  id: string;
  title: string;
  pose: 'young-worried' | 'young-asking' | 'young-think' | 'young-confident' | 'young-greet' | 'young-consider' | 'young-practice'
    | 'laila-reassure' | 'laila-explain' | 'laila-example' | 'laila-greet' | 'laila-privacy' | 'laila-listen';
  speaker: 'الأخت الصغيرة' | 'ليلى';
  text: string;
}
export const SISTERS_STORY: readonly SistersScene[] = [
  { id: 'worry', title: 'واجب الغد', pose: 'young-worried', speaker: 'الأخت الصغيرة', text: 'طلبت مني المعلمة أن أقف أمام زملائي وأعرّف بنفسي. أنا متوترة ولا أعرف كيف أبدأ.' },
  { id: 'thoughts', title: 'ماذا يمكن أن أقول؟', pose: 'young-worried', speaker: 'الأخت الصغيرة', text: 'أفكر في أن أقول اسمي وما أحبّه، لكنني لا أعرف كيف أرتّب كلامي.' },
  { id: 'comfort', title: 'سنتعلّم معًا', pose: 'laila-reassure', speaker: 'ليلى', text: 'لا تقلقي، سأعلّمك كيف تقدّمين نفسك. سنتدرّب خطوةً خطوة.' },
  { id: 'name-question', title: 'أبدأ بالتحية والاسم', pose: 'young-asking', speaker: 'الأخت الصغيرة', text: 'ماذا أقول أولًا؟' },
  { id: 'name-answer', title: 'أبدأ بالتحية والاسم', pose: 'laila-greet', speaker: 'ليلى', text: 'ابدئي بتحية، ثم قولي اسمك: «مرحبًا، أنا…».' },
  { id: 'beginning-try', title: 'أجرّب البداية', pose: 'young-greet', speaker: 'الأخت الصغيرة', text: 'إذن أقول: «مرحبًا، أنا…»، ثم أذكر اسمي!' },
  { id: 'structure-question', title: 'كيف أرتّب كلامي؟', pose: 'young-asking', speaker: 'الأخت الصغيرة', text: 'وماذا بعد البداية؟' },
  { id: 'structure', title: 'بداية ووسط ونهاية', pose: 'laila-explain', speaker: 'ليلى', text: 'بعد التحية والاسم تأتي فكرة عنك في الوسط، ثم تختمين بكلمة لطيفة.' },
  { id: 'middle-question', title: 'ماذا أقول في الوسط؟', pose: 'young-asking', speaker: 'الأخت الصغيرة', text: 'ما الفكرة التي أختارها عن نفسي؟' },
  { id: 'middle-ideas', title: 'أختار فكرة عني', pose: 'laila-example', speaker: 'ليلى', text: 'اختاري شيئًا يسعدك أن تشاركيه، مثل هواية تحبينها أو نشاط تستمتعين به.' },
  { id: 'middle-example', title: 'فكرة واحدة واضحة', pose: 'laila-explain', speaker: 'ليلى', text: 'مثلًا: «أحب القراءة» أو «أحب الرسم». فكرة واحدة واضحة تكفي للبداية.' },
  { id: 'interest-think', title: 'أفكّر فيما أحب', pose: 'young-think', speaker: 'الأخت الصغيرة', text: 'دعيني أفكر… أحب الاستماع إلى القصص!' },
  { id: 'interest-answer', title: 'أعبّر عن فكرتي', pose: 'laila-reassure', speaker: 'ليلى', text: 'فكرة جميلة! قولي: «وأحب الاستماع إلى القصص».' },
  { id: 'interest-learner', title: 'ما الذي تحبّه أنت؟', pose: 'laila-listen', speaker: 'ليلى', text: 'وأنت، فكّر في شيء تحبّه وقل بصوتك: «أحب…».' },
  { id: 'too-much-question', title: 'هل أطيل الكلام؟', pose: 'young-consider', speaker: 'الأخت الصغيرة', text: 'هل أحتاج إلى ذكر أشياء كثيرة ليكون تعريفي جميلًا؟' },
  { id: 'too-much-answer', title: 'كلام صادق وواضح', pose: 'laila-explain', speaker: 'ليلى', text: 'لا تحتاجين تفاصيل كثيرة أو شيئًا غير صحيح. اختاري فكرة صادقة تناسبك وقوليها بوضوح.' },
  { id: 'private-question', title: 'هل أقول كل شيء؟', pose: 'young-consider', speaker: 'الأخت الصغيرة', text: 'هل يجب أن أخبر زملائي بكل شيء عني؟' },
  { id: 'private-answer', title: 'أختار ما أشاركه', pose: 'laila-privacy', speaker: 'ليلى', text: 'لا، ليس عليك قول كل شيء. اختاري ما ترتاحين لمشاركته ويناسب الموقف.' },
  { id: 'private-examples', title: 'معلوماتي الخاصة', pose: 'laila-privacy', speaker: 'ليلى', text: 'عنوان المنزل ورقم الهاتف وكلمات المرور معلومات خاصة؛ لا نذكرها أمام المجموعة أو نشاركها على الإنترنت.' },
  { id: 'private-help', title: 'إذا لم أكن متأكدة', pose: 'young-consider', speaker: 'الأخت الصغيرة', text: 'وإذا لم أعرف إن كانت معلومة مناسبة للمشاركة؟' },
  { id: 'private-guidance', title: 'أسأل شخصًا أثق به', pose: 'laila-reassure', speaker: 'ليلى', text: 'يمكنك سؤال أحد والديك أو معلمتك قبل مشاركتها. وإذا احتجتِ مساعدة، أخبري شخصًا بالغًا تثقين به.' },
  { id: 'ending-question', title: 'كيف أختم؟', pose: 'young-asking', speaker: 'الأخت الصغيرة', text: 'قلت اسمي وما أحبّه، فكيف أنهي كلامي؟' },
  { id: 'ending-answer', title: 'نهاية لطيفة', pose: 'laila-greet', speaker: 'ليلى', text: 'يمكنك أن تختمي بعبارة قصيرة، مثل: «سعيدة بالتعرّف إليكم» أو «شكرًا لاستماعكم».' },
  { id: 'ending-try', title: 'أختار خاتمتي', pose: 'young-greet', speaker: 'الأخت الصغيرة', text: 'سأقول: «سعيدة بالتعرّف إليكم»!' },
  { id: 'model-intro', title: 'استمع إلى مثالي', pose: 'laila-example', speaker: 'ليلى', text: '«مرحبًا، أنا ليلى. أحب القراءة. سعيدة بالتعرّف إليكم.»' },
  { id: 'model-parts', title: 'كيف رتّبت كلامي؟', pose: 'laila-explain', speaker: 'ليلى', text: 'بدأت بالتحية والاسم، وفي الوسط ذكرت ما أحبّه، ثم ختمت بعبارة لطيفة.' },
  { id: 'try-young', title: 'أجرّب بطريقتي', pose: 'young-practice', speaker: 'الأخت الصغيرة', text: 'سأبدأ بالتحية واسمي، ثم أقول إنني أحب القصص، وأختم بكلمة لطيفة.' },
  { id: 'encourage', title: 'أنا أستمع إليك', pose: 'laila-listen', speaker: 'ليلى', text: 'أحسنتِ! جرّبي قولها بصوتك، وخذي وقتك. أنا أستمع إليك.' },
  { id: 'learner', title: 'والآن دورك', pose: 'laila-example', speaker: 'ليلى', text: 'وأنت أيضًا: سلّم وقل اسمك، ثم شيئًا تحبّه، واختم بعبارة لطيفة.' },
  { id: 'listen', title: 'نتعرّف ونستمع', pose: 'laila-listen', speaker: 'ليلى', text: 'اسأل زميلك: «ما اسمك وماذا تحب؟» واستمع إلى إجابته.' },
  { id: 'challenge', title: 'تحدّي التعرّف', pose: 'laila-explain', speaker: 'ليلى', text: 'قدّم نفسك أمام المجموعة، ثم اذكر اسم صديق تعرّفت إليه. تذكّر أن تحتفظ بمعلوماتك الخاصة.' },
  { id: 'finish-young', title: 'خطوتنا الأولى', pose: 'young-practice', speaker: 'الأخت الصغيرة', text: 'الآن أعرف كيف أبدأ وأرتّب كلامي وأختم، وسأحاول أمام زملائي!' },
  { id: 'finish-laila', title: 'خطوتنا الأولى', pose: 'laila-reassure', speaker: 'ليلى', text: 'كل محاولة خطوة جميلة. أحسنتما!' },
];
