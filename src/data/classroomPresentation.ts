export interface ClassroomScene {
  title: string;
  text: string;
  pose: 'young-worried' | 'young-think' | 'young-practice' | 'young-confident' | 'young-greet' | 'young-stance' | 'young-breathe';
  kind: 'thought' | 'speech';
  activity?: 'order';
}

/** The girl applies what she learned at home and in the hallway. */
export const CLASSROOM_PRESENTATION: readonly ClassroomScene[] = [
  { title:'دوري على المنصّة', kind:'thought', pose:'young-worried', text:'حان دوري لأتحدث أمام زملائي. قلبي يدقّ بسرعة قليلًا.' },
  { title:'أقف براحة', kind:'thought', pose:'young-stance', text:'أتذكّر سارة: أضع قدميّ متباعدتين قليلًا، وأقف براحة وأرخي كتفيّ ويديّ.' },
  { title:'أتنفّس بهدوء', kind:'thought', pose:'young-breathe', text:'أضع يدي برفق على بطني إن أحببت، وأتنفّس بهدوء: شهيق مريح من أنفي وزفير بطيء من فمي.' },
  { title:'نرتّب أفكاري معًا', kind:'thought', pose:'young-think', activity:'order', text:'ساعدوني في ترتيب ما سأقوله: اختاروا الأفكار فوق رأسي بالترتيب.' },
  { title:'أبدأ بالتحية', kind:'speech', pose:'young-greet', text:'مرحبًا يا أصدقائي! أنا مريم، عمري ثماني سنوات.' },
  { title:'مدرستي وصفّي', kind:'speech', pose:'young-practice', text:'أدرس في هذه المدرسة، وأنا في الصف الثالث. أحب التعلّم مع زملائي.' },
  { title:'أتوقف لحظة', kind:'thought', pose:'young-breathe', text:'نسيت ما سأقوله بعد ذلك... لا بأس، سأتوقف وأتنفّس، ثم أبدأ بالفكرة التي أتذكّرها.' },
  { title:'ما أحبّه وهوايتي', kind:'speech', pose:'young-practice', text:'أحب الاستماع إلى القصص، وهوايتي المفضلة هي الرسم.' },
  { title:'أختم بلطف', kind:'speech', pose:'young-confident', text:'أنا سعيدة بالتعرّف إليكم. شكرًا لاستماعكم!' },
  { title:'خطوة أفتخر بها', kind:'thought', pose:'young-confident', text:'تذكّرت درس أختي ليلى ونصيحة سارة، وأكملت بطريقتي!' },
];
