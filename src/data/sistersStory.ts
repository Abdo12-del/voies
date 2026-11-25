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
  { id: 'thoughts', title: 'ماذا يمكن أن أقول؟', pose: 'young-worried', speaker: 'الأخت الصغيرة', text: 'أريد أن أتحدث عن نفسي ومدرستي وهواياتي، لكنني لا أعرف كيف أرتّب كلامي.' },
  { id: 'comfort', title: 'سنتعلّم معًا', pose: 'laila-reassure', speaker: 'ليلى', text: 'لا تقلقي، سأعلّمك كيف تقدّمين نفسك. سنتدرّب خطوةً خطوة.' },
  { id: 'name-question', title: 'أبدأ بالتحية والاسم', pose: 'young-asking', speaker: 'الأخت الصغيرة', text: 'ماذا أقول أولًا؟' },
  { id: 'name-answer', title: 'أبدأ بالتحية والاسم', pose: 'laila-greet', speaker: 'ليلى', text: 'ابدئي بتحية، ثم قولي اسمك: «مرحبًا، أنا…».' },
  { id: 'beginning-try', title: 'أجرّب البداية', pose: 'young-greet', speaker: 'الأخت الصغيرة', text: 'إذن أقول: «مرحبًا، أنا…»، ثم أذكر اسمي!' },
  { id: 'structure-question', title: 'كيف أرتّب كلامي؟', pose: 'young-asking', speaker: 'الأخت الصغيرة', text: 'وماذا بعد البداية؟' },
  { id: 'structure', title: 'بداية ووسط ونهاية', pose: 'laila-explain', speaker: 'ليلى', text: 'بعد التحية والاسم، أخبري زملاءك عن عمرك وصفّك ومدرستك وما تحبينه، ثم اختمي بلطف.' },
  { id: 'age-question', title: 'كم عمري؟', pose: 'young-asking', speaker: 'الأخت الصغيرة', text: 'كيف أذكر عمري؟' },
  { id: 'age-answer', title: 'أذكر عمري', pose: 'laila-explain', speaker: 'ليلى', text: 'قولي: «عمري … سنوات»، واملئي الفراغ بعمرك أنت.' },
  { id: 'age-learner', title: 'دورك: عمرك', pose: 'laila-listen', speaker: 'ليلى', text: 'وأنت، كم عمرك؟ جرّب أن تقول: «عمري … سنوات».' },
  { id: 'school-question', title: 'مدرستي وصفّي', pose: 'young-asking', speaker: 'الأخت الصغيرة', text: 'وكيف أتحدث عن مدرستي وصفّي؟' },
  { id: 'school-answer', title: 'أذكر مدرستي', pose: 'laila-explain', speaker: 'ليلى', text: 'في صفّك، يمكنك قول: «أدرس في مدرسة …»، وتذكرين اسم مدرستك.' },
  { id: 'class-answer', title: 'أذكر صفّي', pose: 'laila-example', speaker: 'ليلى', text: 'ثم قولي: «أنا في الصف …»، واذكري صفّك أنت.' },
  { id: 'school-learner', title: 'دورك: المدرسة والصف', pose: 'laila-listen', speaker: 'ليلى', text: 'والآن جرّب: «أدرس في مدرسة …، وأنا في الصف …».' },
  { id: 'middle-question', title: 'ماذا أقول في الوسط؟', pose: 'young-asking', speaker: 'الأخت الصغيرة', text: 'وماذا يمكن أن أقول عن الأشياء التي أحبها؟' },
  { id: 'middle-ideas', title: 'أختار فكرة عني', pose: 'laila-example', speaker: 'ليلى', text: 'تحدّثي عما تحبينه، مثل القصص أو الحيوانات، ثم اذكري هواية تستمتعين بها.' },
  { id: 'middle-example', title: 'فكرة واحدة واضحة', pose: 'laila-explain', speaker: 'ليلى', text: 'الهواية نشاط تحبين ممارسته، مثل الرسم أو القراءة أو لعب الكرة.' },
  { id: 'interest-think', title: 'أفكّر فيما أحب', pose: 'young-think', speaker: 'الأخت الصغيرة', text: 'دعيني أفكر… أحب الاستماع إلى القصص!' },
  { id: 'interest-answer', title: 'أعبّر عن فكرتي', pose: 'laila-reassure', speaker: 'ليلى', text: 'فكرة جميلة! قولي: «وأحب الاستماع إلى القصص».' },
  { id: 'hobby-example', title: 'أذكر هوايتي', pose: 'young-think', speaker: 'الأخت الصغيرة', text: 'أحب القصص، وهوايتي المفضلة الرسم!' },
  { id: 'hobby-learner', title: 'دورك: هوايتك', pose: 'laila-listen', speaker: 'ليلى', text: 'وأنت، ما هوايتك المفضلة؟ قل: «هوايتي المفضلة …».' },
  { id: 'interest-learner', title: 'ما الذي تحبّه أنت؟', pose: 'laila-listen', speaker: 'ليلى', text: 'وأنت، فكّر في شيء تحبّه وقل بصوتك: «أحب…».' },
  { id: 'too-much-question', title: 'هل أطيل الكلام؟', pose: 'young-consider', speaker: 'الأخت الصغيرة', text: 'هل أقول أشياء لا أحبّها فعلًا ليكون تعريفي جميلًا؟' },
  { id: 'too-much-answer', title: 'كلام صادق وواضح', pose: 'laila-explain', speaker: 'ليلى', text: 'لا، تكلّمي عن نفسك بصدق، ورتّبي أفكارك في جمل واضحة.' },
  { id: 'private-question', title: 'هل أقول كل شيء؟', pose: 'young-consider', speaker: 'الأخت الصغيرة', text: 'هل يجب أن أخبر زملائي بكل شيء عني؟' },
  { id: 'private-answer', title: 'أختار ما أشاركه', pose: 'laila-privacy', speaker: 'ليلى', text: 'لا، ليس عليك قول كل شيء. اختاري ما ترتاحين لمشاركته ويناسب الموقف.' },
  { id: 'private-examples', title: 'معلوماتي الخاصة', pose: 'laila-privacy', speaker: 'ليلى', text: 'عنوان المنزل ورقم الهاتف وكلمات المرور معلومات خاصة؛ لا نذكرها أمام المجموعة أو نشاركها على الإنترنت.' },
  { id: 'private-context', title: 'أختار المكان المناسب', pose: 'laila-privacy', speaker: 'ليلى', text: 'العمر واسم المدرسة والصف نشاركها في الصف عند الحاجة، لا مع الغرباء أو على الإنترنت دون إذن شخص بالغ نثق به.' },
  { id: 'private-help', title: 'إذا لم أكن متأكدة', pose: 'young-consider', speaker: 'الأخت الصغيرة', text: 'وإذا لم أعرف إن كانت معلومة مناسبة للمشاركة؟' },
  { id: 'private-guidance', title: 'أسأل شخصًا أثق به', pose: 'laila-reassure', speaker: 'ليلى', text: 'يمكنك سؤال أحد والديك أو معلمتك قبل مشاركتها. وإذا احتجتِ مساعدة، أخبري شخصًا بالغًا تثقين به.' },
  { id: 'ending-question', title: 'كيف أختم؟', pose: 'young-asking', speaker: 'الأخت الصغيرة', text: 'تحدثت عن نفسي وما أحبّه، فكيف أنهي كلامي؟' },
  { id: 'ending-answer', title: 'نهاية لطيفة', pose: 'laila-greet', speaker: 'ليلى', text: 'يمكنك أن تختمي بعبارة قصيرة، مثل: «سعيدة بالتعرّف إليكم» أو «شكرًا لاستماعكم».' },
  { id: 'ending-try', title: 'أختار خاتمتي', pose: 'young-greet', speaker: 'الأخت الصغيرة', text: 'سأقول: «سعيدة بالتعرّف إليكم»!' },
  { id: 'model-intro', title: 'استمع إلى مثالي', pose: 'laila-example', speaker: 'ليلى', text: '«مرحبًا، أنا ليلى. عمري عشر سنوات.» هذا مثال؛ قُل اسمك وعمرك أنت.' },
  { id: 'model-school', title: 'أكمل مثالي', pose: 'laila-example', speaker: 'ليلى', text: '«أدرس في مدرسة النور، وأنا في الصف الرابع.» هذا مثال؛ اذكر مدرستك وصفّك.' },
  { id: 'model-interests', title: 'ما أحبّه وهوايتي', pose: 'laila-example', speaker: 'ليلى', text: '«أحب القصص، وهوايتي المفضلة الرسم. سعيدة بالتعرّف إليكم.»' },
  { id: 'model-parts', title: 'كيف رتّبت كلامي؟', pose: 'laila-explain', speaker: 'ليلى', text: 'بدأت بالتحية والاسم، ثم العمر والمدرسة والصف، وما أحبّه وهوايتي، وختمت بلطف.' },
  { id: 'try-young', title: 'أجرّب بطريقتي', pose: 'young-practice', speaker: 'الأخت الصغيرة', text: 'سأذكر اسمي وعمري ومدرستي وصفّي، ثم ما أحبّه وهوايتي، وأختم بكلمة لطيفة.' },
  { id: 'encourage', title: 'أنا أستمع إليك', pose: 'laila-listen', speaker: 'ليلى', text: 'أحسنتِ! جرّبي قولها بصوتك، وخذي وقتك. أنا أستمع إليك.' },
  { id: 'learner', title: 'والآن دورك', pose: 'laila-example', speaker: 'ليلى', text: 'والآن عرّف بنفسك: اسمك وعمرك ومدرستك وصفّك، وما تحبّه وهوايتك المفضلة، ثم اختم بلطف.' },
  { id: 'listen', title: 'نتعرّف ونستمع', pose: 'laila-listen', speaker: 'ليلى', text: 'اسأل زميلك: «ما اسمك وماذا تحب؟» واستمع إلى إجابته.' },
  { id: 'challenge', title: 'تحدّي التعرّف', pose: 'laila-explain', speaker: 'ليلى', text: 'قدّم نفسك أمام المجموعة، ثم اذكر اسم صديق تعرّفت إليه. تذكّر أن تحتفظ بمعلوماتك الخاصة.' },
  { id: 'finish-young', title: 'خطوتنا الأولى', pose: 'young-practice', speaker: 'الأخت الصغيرة', text: 'الآن أعرف كيف أعرّف بنفسي وأرتّب كلامي، وسأحاول أمام زملائي!' },
  { id: 'finish-laila', title: 'خطوتنا الأولى', pose: 'laila-reassure', speaker: 'ليلى', text: 'كل محاولة خطوة جميلة. أحسنتما!' },
];
