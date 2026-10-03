// App guidance is deterministic: friendly onboarding without an inference call.
export function guidanceReply(question,hasMemories=false){
 const q=question.trim().toLowerCase().replace(/[?!.,]+$/,'');
 if(/^(hi|hello|hey|hiya|good morning|good evening)( there)?$/.test(q))return hasMemories?'Hi! What would you like to find in your memories? Try “What did I save about GPUs?” or use + to save something new.':'Hi! I’m BrainDump. Drop a link, screenshot, or thought using +, then ask me about it whenever you need it.';
 if(/^(what(?: is|’s|'s) your name|who are you|what are you)$/.test(q))return 'I’m BrainDump, your memory assistant. I help you save things you don’t want to lose and find them later. Use + to add a memory, or ask about something you’ve saved.';
 if(/^(what|huh|help|help me|how does this work|what can you do|how do i use (?:this|braindump))$/.test(q))return 'Start with + to save a link, screenshot, or thought. For articles, paste the text; for screenshots, add a description. Then ask something like “What was that GPU article I saved?” I’ll bring back the source so you can ask about it.';
 if(/^(thanks|thank you|thankyou|ok|okay|got it|cool)$/.test(q))return hasMemories?'You’re welcome. Ask about a saved topic whenever you need it, or add another memory with +.':'Ready when you are—use + to save your first memory.';
 return null;
}
