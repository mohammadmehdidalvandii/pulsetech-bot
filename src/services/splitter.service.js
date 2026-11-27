const MAX_TELEGRAM_LENGTH = 3900;

export function buildTelegramMessages(newsletter){
    const header = `📰 <b>${newsletter.title}</b>\n\n`;
    const blocks = Array.isArray(newsletter.content_blocks)
    ? newsletter.content_blocks 
    : [];

    if(blocks.length === 0){
        return [header.trim()];
    };

    const messages = [];
    let currentMessage = header;

    for (const block of blocks){
        const cleanBlock = String(block).trim();
        if(!cleanBlock) continue;

        if(currentMessage.length + cleanBlock.length + 2 > MAX_TELEGRAM_LENGTH){
            if(currentMessage.trim().length > 0){
                messages.push(currentMessage.trim());
            }
            currentMessage = cleanBlock + '\n\n';
        }else{
            currentMessage += cleanBlock + '\n\n';
        }
    }

    if(currentMessage.trim().length > 0){
        messages.push(currentMessage.trim());
    }
    return messages;
}