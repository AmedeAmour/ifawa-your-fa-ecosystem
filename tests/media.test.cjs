const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(path, globals = {}, deps = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path, 'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,
    {exports, File, Blob, Date, require: name => deps[name], ...globals});
  return exports;
}
test('photos are resized and genuinely encoded as WebP, never silently uploaded as PNG', async () => {
  let closed = 0;
  let outputType = 'image/webp';
  const canvas = {getContext:()=>({drawImage(){}}),toBlob:callback=>callback(new Blob(['photo'],{type:outputType}))};
  const {photoToWebP} = load('src/lib/image-webp.ts', {createImageBitmap:async()=>({width:4000,height:2000,close(){closed++;}}),document:{createElement:()=>canvas}});
  const input = new File(['original'],'portrait.jpg',{type:'image/jpeg'});
  const result = await photoToWebP(input,1600);
  assert.equal(result.type,'image/webp'); assert.equal(result.name,'portrait.webp');
  assert.equal(canvas.width,1600); assert.equal(canvas.height,800);
  outputType = 'image/png';
  await assert.rejects(()=>photoToWebP(input), /WebP/);
  assert.equal(closed,2);
});
test('audio accepts recorder codecs and rejects empty, oversized and non-audio attachments', () => {
  const {audioFormat} = load('src/lib/service-audio.ts',{}, {'./supabase':{supabase:null}});
  assert.equal(audioFormat({type:'audio/webm;codecs=opus',size:100}).extension,'webm');
  for(const file of [{type:'image/png',size:100},{type:'audio/mp4',size:0},{type:'audio/mp4',size:10485761}]) assert.throws(()=>audioFormat(file));
});
test('audio-only service requests persist the private path and clean up uploads if insertion fails', async () => {
  let inserted; let failure = null; let removed;
  const supabase = {auth:{getUser:async()=>({data:{user:{id:'alice'}}})},from:()=>({insert:row=>{inserted=row;return {select:()=>({single:async()=>({data:{id:'request'},error:failure})})};}}),storage:{from:()=>({remove:async paths=>{removed=paths;}})}};
  const {createServiceRequest} = load('src/lib/ifawa-services.ts',{}, {'./supabase':{supabase},'./service-audio':{uploadServiceAudio:async()=> 'alice/voice.webm'},'./ifawa-cache':{},'@/data/mock':{services:[]}});
  const request={serviceSlug:'consultation',formulaName:'',subject:'',deadline:'',details:'',audio:new File(['voice'],'voice.webm',{type:'audio/webm'})};
  await createServiceRequest(request);
  assert.equal(inserted.subject,'Demande vocale');
  assert.equal(inserted.request_details.audio_path,'alice/voice.webm');
  failure = new Error('insert failed');
  await assert.rejects(()=>createServiceRequest(request), /insert failed/);
  assert.equal(removed[0],'alice/voice.webm');
});
