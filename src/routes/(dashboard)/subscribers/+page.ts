    import type { PageLoad } from './$types';
    import { getLookups } from '$lib/api/dashboard';
    import { getSubscribers } from '$lib/api/subscribers';
    import { getPaymentCycles } from '$lib/api/payment_cycles';
    import { getCurrentUser, isAdmin, getUserCenters } from '$lib/auth';

    // Disable Server-Side Rendering for this page to use localStorage auth
    export const ssr = false;

    export const load: PageLoad = async ({ url, fetch }) => {
        // Extract all possible filter and pagination parameters from the URL
        const page = Number(url.searchParams.get('page') ?? 1);
        const search = url.searchParams.get('search') ?? undefined;

        const city = url.searchParams.get('city') ?? undefined;
        const unit = url.searchParams.get('unit') ?? undefined;
        const pincode = url.searchParams.get('pincode') ?? undefined;
        const center_name = url.searchParams.get('center_name') ?? undefined;
        const landmark = url.searchParams.get('landmark') ?? undefined;
        const has_due_payment = url.searchParams.get('has_due_payment') === 'true';

        try {
            // Get current user to apply role-based filtering
            const user = getCurrentUser();
            const userIsAdmin = isAdmin(user);
            const userCenters = getUserCenters(user);

            // Fetch lookups - pass center filter for executives
            const lookupsPromise = getLookups(fetch, userIsAdmin ? undefined : userCenters);
            let subscriberIds: string[] | undefined = undefined;

            if (has_due_payment) {
                // If executive, filter payment cycles by their centers as well
                // We'll pass the center filter via a new param if needed, but for now we'll fetch all due and intersection happens on subscribers
                const dueCycles = await getPaymentCycles({ is_due: true, perPage: 5000 });
                const ids = Array.from(
                    new Set(
                        (dueCycles.items ?? [])
                            .map((cycle) => cycle?.subscriber)
                            .filter((id): id is string => Boolean(id))
                    )
                );
                subscriberIds = ids.length > 0 ? ids : ['__none__']; // '__none__' will force an empty result set
            }

            // Apply executive center filtering to the subscribers query
            // We use the center_filter param which should be added to getSubscribers
            const subscribersData =
                has_due_payment && subscriberIds?.[0] === '__none__'
                    ? {
                        page: 1,
                        perPage: 25,
                        totalItems: 0,
                        totalPages: 1,
                        items: []
                    }
                    : await getSubscribers({
                        page,
                        search,
                        city,
                        unit,
                        pincode,
                        center_name,
                        landmark,
                        subscriberIds: subscriberIds?.[0] === '__none__' ? [] : subscriberIds,
                        centerFilter: userIsAdmin ? undefined : userCenters
                    });

            console.log('DEBUG: Subscribers API Response:', JSON.stringify(subscribersData, null, 2));

            const lookups = await lookupsPromise;

            return {
                subscribersData,
                lookups,
                subscriberIds: subscriberIds?.[0] === '__none__' ? [] : subscriberIds,
                error: null
            };
        } catch (error: any) {
            console.error('Failed to load subscribers page data:', error);

            return {
                subscribersData: null,
                lookups: null,
                error: error.message || 'Could not load subscribers.'
            };
        }
    };
