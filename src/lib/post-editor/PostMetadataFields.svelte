<script lang="ts">
	import * as m from '$lib/paraglide/messages.js';
	import type { PostEditorForm, PostEditorOptions } from './types';

	let { form, options } = $props<{ form: PostEditorForm; options: PostEditorOptions }>();
</script>

<div class="form-grid">
	<label for="title">{m.title()}</label>
	<div>
		<input id="title" name="title" defaultValue={form.data.title} required />
		{#each form.errors.title ?? [] as error}<small class="field-error">{error}</small>{/each}
	</div>
	<label for="subtitle">{m.subtitle()}</label>
	<div class="subtitle-field">
		<input id="subtitle" name="subtitle" defaultValue={form.data.subtitle} />
		{#each form.errors.subtitle ?? [] as error}<small class="field-error">{error}</small>{/each}
	</div>
	<label for="description">{m.description()}</label>
	<div>
		<textarea
			id="description"
			name="description"
			rows="2"
			defaultValue={form.data.description}
			required></textarea>
		{#each form.errors.description ?? [] as error}<small class="field-error">{error}</small>{/each}
	</div>
	<label for="seriesId">{m.series_title()}</label><select id="seriesId" name="seriesId">
		<option value="" selected={form.data.seriesId === null}>{m.none()}</option>
		{#each options.series as item}<option value={item.id} selected={form.data.seriesId === item.id}
				>{item.title}</option
			>{/each}
	</select>
	<label for="seriesPosition">{m.series_position()}</label>
	<div>
		<input
			id="seriesPosition"
			type="number"
			min="1"
			name="seriesPosition"
			defaultValue={form.data.seriesPosition ?? ''}
		/>
		{#each form.errors.seriesPosition ?? [] as error}<small class="field-error">{error}</small
			>{/each}
	</div>
	<span>{m.categories_title()}</span>
	<div class="categories-field">
		<fieldset>
			{#each options.categories as item}<label
					><input
						type="checkbox"
						name="categories"
						value={item.id}
						defaultChecked={form.data.categories.includes(item.id)}
					/>
					{item.name}</label
				>{/each}
		</fieldset>
		{#each form.errors.categories?._errors ?? [] as error}<small class="field-error">{error}</small
			>{/each}
	</div>
	<label for="tags">{m.tags()}</label>
	<div>
		<input id="tags" name="tags" defaultValue={form.data.tags} placeholder="tag-1, tag-2" />
		{#each form.errors.tags ?? [] as error}<small class="field-error">{error}</small>{/each}
	</div>
	<label for="publishedAt">{m.publish_at()}</label>
	<div>
		<input
			id="publishedAt"
			type="datetime-local"
			name="publishedAt"
			defaultValue={form.data.publishedAt}
		/>
		{#each form.errors.publishedAt ?? [] as error}<small class="field-error">{error}</small>{/each}
	</div>
	<label for="noindex">{m.no_index()}</label><label
		><input id="noindex" type="checkbox" name="noindex" defaultChecked={form.data.noindex} />
		{m.no_index_help()}</label
	>
</div>

<style>
	fieldset {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem 1rem;
		margin: 0;
		padding: 0.45rem 0;
		border: 0;
	}
	fieldset label {
		white-space: nowrap;
	}
</style>
