import MailerLite from '@mailerlite/mailerlite-nodejs';
import { handleError } from '../../utils';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const createGroup = async (mailerlite_api: MailerLite, params: any): Promise<void> => {
    try {
        const response = await mailerlite_api.groups.get(params);
        console.log(response.data);
    } catch (error: unknown) {
        handleError(error);
    }
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const listGroups = async (mailerlite_api: MailerLite, params: any): Promise<any> => {
    try {
        const response = await mailerlite_api.groups.get(params);
        return response.data;
    } catch (error: unknown) {
        handleError(error);
    }
};