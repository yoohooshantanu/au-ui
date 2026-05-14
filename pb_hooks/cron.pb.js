/// <reference path="../pb_data/types.d.ts" />

/**
 * PocketBase Background Cron Job: Auto-Generate Monthly Bills
 * -----------------------------------------------------------
 * This script runs automatically every single day at midnight (00:00).
 * It scans all "running" subscribers. If their most recent payment cycle
 * ended yesterday or earlier, it automatically generates a new Due bill
 * for them starting from the day after their last cycle, ending on the
 * last day of that new month.
 * 
 * IMPORTANT NOTE: This syntax is tested up to PocketBase v0.22.x. 
 * If you update to PB v0.23+, `$app.dao()` changes slightly to `$app.findRecordsByFilter()`.
 */

cronAdd("auto_generate_bills", "0 0 * * *", () => {
    console.log("Running auto-generate bills cron job...");
    
    // 1. Fetch running subscribers
    const subscribers = $app.dao().findRecordsByFilter("subscribers", "status = 'running'");
    
    let generatedCount = 0;
    let errorCount = 0;
    
    const now = new Date();
    // Normalize today to just the date, ignoring time
    now.setHours(0,0,0,0);

    for (let sub of subscribers) {
        try {
            // 2. Fetch the single latest payment cycle for this subscriber
            const cycles = $app.dao().findRecordsByFilter(
                "payment_cycles", 
                `subscriber = '${sub.getId()}'`, 
                "-end_date", 
                1 // Only get the latest one
            );
            
            if (!cycles || cycles.length === 0) {
                // Ignore subscribers who have never had a cycle created for them yet
                continue;
            }
            
            const latestCycle = cycles[0];
            const endDateStr = latestCycle.getString("end_date");
            const endDate = new Date(endDateStr);
            endDate.setHours(0,0,0,0);
            
            // 3. Check if the latest cycle has ended (in the past or today)
            if (endDate <= now) {
                const newStartDate = new Date(endDate);
                newStartDate.setDate(newStartDate.getDate() + 1);
                
                // End date is the last day of the new start date's month
                const newEndDate = new Date(newStartDate.getFullYear(), newStartDate.getMonth() + 1, 0); 
                
                // 4. Create the new billing record for the next month
                const collection = $app.dao().findCollectionByNameOrId("payment_cycles");
                const record = new Record(collection);
                
                record.set("subscriber", sub.getId());
                // PB expects UTC timezone strings, e.g. "YYYY-MM-DD 00:00:00.000Z"
                record.set("start_date", newStartDate.toISOString().split('T')[0] + " 00:00:00.000Z");
                record.set("end_date", newEndDate.toISOString().split('T')[0] + " 23:59:59.999Z");
                record.set("amount", latestCycle.getFloat("amount"));
                record.set("coupon_amount", 0);
                record.set("is_due", true);
                record.set("product_code", latestCycle.getString("product_code"));
                
                $app.dao().saveRecord(record);
                generatedCount++;
            }
        } catch(err) {
            errorCount++;
            console.error("Error processing subscriber " + sub.getId() + ": " + err);
        }
    }
    
    console.log(`Finished auto-generating bills. Created: ${generatedCount}, Errors: ${errorCount}`);
});
