export interface ClassroomScene {
  title: string;
  text: string;
  pose: 'young-worried' | 'young-think' | 'young-practice' | 'young-confident' | 'young-greet';
  kind: 'thought' | 'speech';
}

/** The girl applies what she learned at home and in the hallway. */
export const CLASSROOM_PRESENTATION: readonly ClassroomScene[] = [
  { title:'دوري على المنصّة', kind:'thought', pose:'young-worried', text:'حان دوري لأتحدث أمام زملائي. قلبي يدقّ بسرعة قليلًا.' },
  { title:'أتذكّر ما تعلّمته', kind:'thought', pose:'young-think', text:'أتذكّر سارة: أقف براحة، وأرخي كتفيّ، وأتنفّس بهدوء قبل أن أبدأ.' },
  { title:'أبدأ بالتحية', kind:'speech', pose:'young-greet', text:'مرحبًا يا أصدقائي! أنا مريم، عمري ثماني سنوات.' },
  { title:'مدرستي وصفّي', kind:'speech', pose:'young-practice', text:'أدرس في هذه المدرسة، وأنا في الصف الثالث. أحب التعلّم مع زملائي.' },
  { title:'أتوقف لحظة', kind:'thought', pose:'young-think', text:'نسيت ما سأقوله بعد ذلك... لا بأس، سأتوقف وأتنفّس، ثم أبدأ بالفكرة التي أتذكّرها.' },
  { title:'ما أحبّه وهوايتي', kind:'speech', pose:'young-practice', text:'أحب الاستماع إلى القصص، وهوايتي المفضلة هي الرسم.' },
  { title:'أختم بلطف', kind:'speech', pose:'young-confident', text:'أنا سعيدة بالتعرّف إليكم. شكرًا لاستماعكم!' },
  { title:'خطوة أفتخر بها', kind:'thought', pose:'young-confident', text:'تذكّرت درس أختي ليلى ونصيحة سارة، وأكملت بطريقتي!' },
];
