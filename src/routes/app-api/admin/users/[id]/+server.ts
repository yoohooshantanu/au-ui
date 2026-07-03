import { env } from '$env/dynamic/private';
import { json } from '@sveltejs/kit';

const PB_URL = 'http://127.0.0.1:8090';

async function getAdminToken() {
    const email = env.PB_EMAIL;
    const password = env.PB_PASSWORD;
    if (!email || !password) return '';
    try {
        const authRes = await fetch(`${PB_URL}/api/collections/_superusers/auth-with-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identity: email, password: password })
        });
        const authData = await authRes.json();
        return authData?.token || '';
    } catch (err) {
        console.error("Admin Auth Failed", err);
        return '';
    }
}

export async function PATCH({ params, request }) {
    const id = params.id;
    const adminToken = await getAdminToken();
    
    if (!adminToken) {
        return json({ message: 'Server misconfiguration: No admin credentials' }, { status: 500 });
    }

    const payload = await request.json();

    const response = await fetch(`${PB_URL}/api/collections/users/records/${id}`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        return json(err, { status: response.status });
    }

    const data = await response.json();
    return json(data);
}

export async function DELETE({ params }) {
    const id = params.id;
    const adminToken = await getAdminToken();
    
    if (!adminToken) {
        return json({ message: 'Server misconfiguration: No admin credentials' }, { status: 500 });
    }

    const response = await fetch(`${PB_URL}/api/collections/users/records/${id}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${adminToken}`
        }
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        return json(err, { status: response.status });
    }

    return json({ success: true });
}
