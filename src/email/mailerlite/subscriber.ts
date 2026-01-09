'use server';
import { handleError } from '../../utils';
import { mailerLiteService } from './config';

export async function createOrUpdateSubscriber(formData: FormData): Promise<{ success: boolean; subscriberId?: string; message?: string }> {
    const email = formData.get('email') as string;
    const firstName = formData.get('firstName') as string;
    const lastName = formData.get('lastName') as string;

    const subscriberData = {
        email: email,
        fields: {
            name: firstName,
            last_name: lastName
        }
    };

    try {
        const response = await mailerLiteService.subscribers.createOrUpdate(subscriberData);
        return { success: true, subscriberId: response.data.data.id };
    } catch (error: unknown) {
        handleError(error);
        return { success: false, message: 'An error occurred while adding the subscriber to the group' };
    }
}

export async function addSubscriberToGroup(groupName: string, subscriberId: string): Promise<{ success: boolean; message?: string }> {
    try {
        // Find the group ID by listing groups with the filter of the group name
        const groupsResponse = await mailerLiteService.groups.get({
            limit: 1,
            page: 1,
            filter: { name: groupName },
            sort: "name"
        });

        if (!groupsResponse.data.data.length) {
            return { success: false, message: `Group '${groupName}' not found` };
        }

        const groupId = groupsResponse.data.data[0].id;

        // Add the subscriber to the group
        await mailerLiteService.groups.assignSubscriber(subscriberId, groupId);

        return { success: true, message: `Subscriber added to group '${groupName}'` };
    } catch (error: unknown) {
        handleError(error);
        return { success: false, message: 'An error occurred while adding the subscriber to the group' };
    }
};